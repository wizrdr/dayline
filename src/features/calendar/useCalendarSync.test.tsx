import { render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import type { CalendarEvent, IcsFeed } from '@/domain/types'
import { createFeed, softDeleteRow } from '@/db/repo'
import { db } from '@/db/schema'
import { useCalendarStatus } from './status'
import { useCalendarSync } from './useCalendarSync'

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  supabase: null as unknown,
  user: { id: 'u1' } as { id: string } | null,
}))

vi.mock('@/lib/supabase', () => ({
  get supabase() {
    return mocks.supabase
  },
  get supabaseConfigured() {
    return mocks.supabase !== null
  },
}))

vi.mock('@/features/auth/session', () => ({
  useSession: () => ({ user: mocks.user, session: null, loading: false }),
}))

const fakeClient = { functions: { invoke: mocks.invoke } }

function Probe() {
  useCalendarSync()
  return null
}

type IcsEvent = Omit<CalendarEvent, 'feed_id'>

function event(id: string, date: string): IcsEvent {
  return { id, title: id, date, start_min: 600, duration_min: 60, all_day: false }
}

function ok(events: IcsEvent[]) {
  return { data: { events, fetched_at: new Date().toISOString() }, error: null }
}

function feedInput(name: string): Omit<IcsFeed, 'id' | 'user_id' | 'updated_at' | 'deleted_at'> {
  return { name, url: 'https://calendar.example/secret.ics', color: 1 }
}

async function settle(): Promise<void> {
  await new Promise((r) => setTimeout(r, 50))
}

beforeEach(async () => {
  await db.delete()
  await db.open()
  mocks.invoke.mockReset()
  mocks.supabase = fakeClient
  mocks.user = { id: 'u1' }
  useCalendarStatus.setState({ errors: {} })
})

afterEach(() => {
  vi.restoreAllMocks()
})

test('writes events of each active feed into calendar_events with feed_id', async () => {
  const feed = await createFeed(feedInput('Work'), 'u1')
  mocks.invoke.mockResolvedValue(ok([event('a', '2026-09-04'), event('b', '2026-09-05')]))

  render(<Probe />)

  await waitFor(async () => expect(await db.calendar_events.count()).toBe(2))
  const rows = await db.calendar_events.toArray()
  expect(rows.every((r) => r.feed_id === feed.id)).toBe(true)
  expect(mocks.invoke).toHaveBeenCalledWith('ics', {
    body: { feed_id: feed.id, tz: Intl.DateTimeFormat().resolvedOptions().timeZone },
  })
  expect((await db.meta.get(`ics_fetched:${feed.id}`))?.value).toBeTruthy()
})

test('replaces the cached events of a feed on the next fetch', async () => {
  const feed = await createFeed(feedInput('Work'), 'u1')
  mocks.invoke.mockResolvedValueOnce(ok([event('a', '2026-09-04'), event('b', '2026-09-05')]))
  const first = render(<Probe />)
  await waitFor(async () => expect(await db.calendar_events.count()).toBe(2))
  first.unmount()

  await db.meta.put({ key: `ics_fetched:${feed.id}`, value: new Date(Date.now() - 3_600_000).toISOString() })
  mocks.invoke.mockResolvedValueOnce(ok([event('c', '2026-09-06')]))
  render(<Probe />)

  await waitFor(async () => expect((await db.calendar_events.toArray()).map((r) => r.id)).toEqual(['c']))
  expect(mocks.invoke).toHaveBeenCalledTimes(2)
})

test('skips a feed fetched less than a minute ago', async () => {
  const feed = await createFeed(feedInput('Work'), 'u1')
  await db.meta.put({ key: `ics_fetched:${feed.id}`, value: new Date().toISOString() })

  render(<Probe />)
  await settle()

  expect(mocks.invoke).not.toHaveBeenCalled()
})

test('does nothing when supabase is not configured', async () => {
  mocks.supabase = null
  await createFeed(feedInput('Work'), 'u1')

  render(<Probe />)
  await settle()

  expect(mocks.invoke).not.toHaveBeenCalled()
  expect(await db.calendar_events.count()).toBe(0)
})

test('reports a failed fetch in useCalendarStatus and keeps the old cache', async () => {
  const feed = await createFeed(feedInput('Work'), 'u1')
  await db.calendar_events.add({ ...event('old', '2026-09-01'), feed_id: feed.id })
  mocks.invoke.mockResolvedValue({ data: null, error: new Error('boom') })

  render(<Probe />)

  await waitFor(() => expect(useCalendarStatus.getState().errors[feed.id]).toBe('boom'))
  expect(await db.calendar_events.count()).toBe(1)
})

test('drops cached events of a soft-deleted feed', async () => {
  const feed = await createFeed(feedInput('Old'), 'u1')
  await db.calendar_events.add({ ...event('x', '2026-09-01'), feed_id: feed.id })
  await softDeleteRow('ics_feeds', feed.id)
  mocks.invoke.mockResolvedValue(ok([]))

  render(<Probe />)

  await waitFor(async () => expect(await db.calendar_events.count()).toBe(0))
  expect(mocks.invoke).not.toHaveBeenCalled()
})
