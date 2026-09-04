import { useEffect, useRef } from 'react'
import { FunctionsHttpError, type SupabaseClient } from '@supabase/supabase-js'
import { useFeeds } from '@/db/hooks'
import { db } from '@/db/schema'
import type { CalendarEvent } from '@/domain/types'
import { useSession } from '@/features/auth/session'
import { supabase } from '@/lib/supabase'
import { useCalendarStatus } from './status'

const REFRESH_MS = 15 * 60_000
const VISIBLE_MAX_AGE_MS = 5 * 60_000
const MOUNT_MAX_AGE_MS = 60_000
const META_PREFIX = 'ics_fetched:'

type IcsEvent = Omit<CalendarEvent, 'feed_id'>

interface IcsResponse {
  events: IcsEvent[]
  fetched_at: string
}

type SetError = (feedId: string, message: string | null) => void

export function useCalendarSync(): void {
  const { user } = useSession()
  const feedKey = useFeeds()
    .map((f) => f.id)
    .sort()
    .join(',')
  const setError = useCalendarStatus((s) => s.setError)
  const inFlight = useRef(new Set<string>())
  const userId = user?.id

  useEffect(() => {
    if (!supabase || !userId) return
    const client = supabase
    const ids = feedKey ? feedKey.split(',') : []
    const refresh = (maxAgeMs: number) => void refreshFeeds(client, ids, maxAgeMs, inFlight.current, setError)
    const onVisible = () => document.visibilityState === 'visible' && refresh(VISIBLE_MAX_AGE_MS)

    refresh(MOUNT_MAX_AGE_MS)
    const timer = setInterval(() => refresh(0), REFRESH_MS)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [userId, feedKey, setError])
}

async function refreshFeeds(
  client: SupabaseClient,
  ids: string[],
  maxAgeMs: number,
  inFlight: Set<string>,
  setError: SetError,
): Promise<void> {
  try {
    await purgeDeletedFeeds()
    const now = Date.now()
    await Promise.all(
      ids.map(async (id) => {
        if (inFlight.has(id) || now - (await lastFetched(id)) < maxAgeMs) return
        inFlight.add(id)
        try {
          await fetchFeed(client, id, setError)
        } finally {
          inFlight.delete(id)
        }
      }),
    )
  } catch (e) {
    console.error('calendar refresh failed', e)
  }
}

async function purgeDeletedFeeds(): Promise<void> {
  const deleted = await db.ics_feeds.filter((f) => f.deleted_at !== null).primaryKeys()
  if (deleted.length === 0) return
  await db.transaction('rw', db.calendar_events, db.meta, async () => {
    await db.calendar_events.where('feed_id').anyOf(deleted).delete()
    await db.meta.bulkDelete(deleted.map(metaKey))
  })
}

async function fetchFeed(client: SupabaseClient, feedId: string, setError: SetError): Promise<void> {
  try {
    const { data, error } = await client.functions.invoke<IcsResponse>('ics', {
      body: { feed_id: feedId, tz: Intl.DateTimeFormat().resolvedOptions().timeZone },
    })
    if (error) throw error
    if (!isIcsResponse(data)) throw new Error('Некорректный ответ сервера')
    await storeEvents(feedId, data)
    setError(feedId, null)
  } catch (e) {
    setError(feedId, await describeError(e))
  }
}

async function storeEvents(feedId: string, res: IcsResponse): Promise<void> {
  const rows: CalendarEvent[] = res.events.map((e) => ({ ...e, feed_id: feedId }))
  await db.transaction('rw', db.calendar_events, db.meta, async () => {
    await db.calendar_events.where('feed_id').equals(feedId).delete()
    await db.calendar_events.bulkAdd(rows)
    await db.meta.put({ key: metaKey(feedId), value: res.fetched_at })
  })
}

async function lastFetched(feedId: string): Promise<number> {
  const row = await db.meta.get(metaKey(feedId))
  const ts = row ? Date.parse(row.value) : Number.NaN
  return Number.isNaN(ts) ? 0 : ts
}

function metaKey(feedId: string): string {
  return `${META_PREFIX}${feedId}`
}

function isIcsResponse(data: unknown): data is IcsResponse {
  if (typeof data !== 'object' || data === null) return false
  const r = data as Partial<IcsResponse>
  return Array.isArray(r.events) && typeof r.fetched_at === 'string'
}

async function describeError(e: unknown): Promise<string> {
  if (e instanceof FunctionsHttpError) {
    const ctx: unknown = e.context
    if (ctx instanceof Response) {
      const body: unknown = await ctx.clone().json().catch(() => null)
      const message = typeof body === 'object' && body !== null ? (body as { error?: unknown }).error : null
      if (typeof message === 'string') return message
    }
  }
  return e instanceof Error ? e.message : 'Неизвестная ошибка'
}
