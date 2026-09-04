import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import type { Task } from '../domain/types'
import { createTask, listTasks, patchRow } from '../db/repo'
import { db } from '../db/schema'
import { FakeSupabase } from './fakeClient'
import { createSync, type SyncStatus } from './sync'

const USER = 'u1'

const taskInput = {
  title: 'Task',
  note: '',
  color: 1,
  date: '2026-09-04',
  start_min: 540,
  duration_min: 60,
  done: false,
  kind: 'single',
  weekdays: null,
  start_date: null,
  end_date: null,
  remind_min_before: null,
} satisfies Omit<Task, 'id' | 'user_id' | 'updated_at' | 'deleted_at'>

function remoteTask(id: string, updated_at: string, extra: Partial<Task> = {}): Task {
  return { ...taskInput, id, user_id: USER, updated_at, deleted_at: null, ...extra }
}

function iso(offsetMs: number): string {
  return new Date(Date.UTC(2026, 0, 1) + offsetMs).toISOString()
}

let fake: FakeSupabase
let statuses: SyncStatus[]

function makeSync() {
  return createSync({ client: fake, db, userId: USER, onStatus: (s) => statuses.push(s) })
}

beforeEach(async () => {
  await db.delete()
  await db.open()
  fake = new FakeSupabase()
  statuses = []
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

test('(a) putRow marks dirty, pushDirty uploads without _dirty and clears the flag', async () => {
  const task = await createTask(taskInput, USER)
  expect((await db.tasks.get(task.id))?._dirty).toBe(1)

  await makeSync().pushDirty()

  const remote = fake.rows('tasks')
  expect(remote).toHaveLength(1)
  expect(remote[0]).not.toHaveProperty('_dirty')
  expect(remote[0].id).toBe(task.id)
  expect((await db.tasks.get(task.id))?._dirty).toBe(0)
  expect(statuses.at(-1)?.state).toBe('idle')
})

test('(b) pull inserts remote rows clean and advances last_pull', async () => {
  fake.seed('tasks', [remoteTask('r1', iso(1000)), remoteTask('r2', iso(2000))])

  await makeSync().pull()

  const local = await db.tasks.toArray()
  expect(local.map((t) => [t.id, t._dirty])).toEqual([
    ['r1', 0],
    ['r2', 0],
  ])
  expect((await db.meta.get('last_pull:tasks'))?.value).toBe(iso(2000))

  fake.selectCalls = 0
  await makeSync().pull()
  expect(fake.selectCalls).toBe(3)
  expect(await db.tasks.count()).toBe(2)
})

test('(c) LWW: newer remote overwrites clean local; older remote loses to dirty local', async () => {
  await db.tasks.bulkPut([
    { ...remoteTask('clean', iso(1000), { title: 'local clean' }), _dirty: 0 },
    { ...remoteTask('dirty', iso(5000), { title: 'local dirty' }), _dirty: 1 },
  ])
  fake.seed('tasks', [
    remoteTask('clean', iso(2000), { title: 'remote newer' }),
    remoteTask('dirty', iso(4000), { title: 'remote older' }),
  ])

  await makeSync().pull()

  expect(await db.tasks.get('clean')).toMatchObject({ title: 'remote newer', updated_at: iso(2000), _dirty: 0 })
  expect(await db.tasks.get('dirty')).toMatchObject({ title: 'local dirty', updated_at: iso(5000), _dirty: 1 })
})

test('(d) remote soft-delete is stored and hidden from list queries', async () => {
  await db.tasks.put({ ...remoteTask('t1', iso(1000)), _dirty: 0 })
  fake.seed('tasks', [remoteTask('t1', iso(2000), { deleted_at: iso(2000) })])

  await makeSync().pull()

  expect(await db.tasks.get('t1')).toMatchObject({ deleted_at: iso(2000), _dirty: 0 })
  expect(await listTasks()).toEqual([])
})

test('(e) edit during an in-flight upsert keeps the row dirty', async () => {
  let release!: () => void
  fake.upsertGate = new Promise<void>((r) => {
    release = r
  })
  const task = await createTask(taskInput, USER)
  const sync = makeSync()

  const flight = sync.pushDirty()
  await vi.waitFor(() => expect(fake.upsertCalls).toHaveLength(1))
  await patchRow('tasks', task.id, { title: 'edited mid-flight' })
  release()
  await flight

  expect((await db.tasks.get(task.id))?._dirty).toBe(1)
  expect(fake.rows('tasks')[0].title).toBe('Task')

  fake.upsertGate = null
  await sync.pushDirty()
  expect((await db.tasks.get(task.id))?._dirty).toBe(0)
  expect(fake.rows('tasks')[0].title).toBe('edited mid-flight')
})

test('(f) pagination pulls all 501 remote rows', async () => {
  fake.seed(
    'tasks',
    Array.from({ length: 501 }, (_, i) => remoteTask(`r${i}`, iso(i * 1000))),
  )

  await makeSync().pull()

  expect(await db.tasks.count()).toBe(501)
  expect((await db.meta.get('last_pull:tasks'))?.value).toBe(iso(500 * 1000))
  expect(fake.selectCalls).toBe(4)
})

test('(g) realtime change triggers a debounced pull; stop removes the channel', async () => {
  const sync = makeSync()
  sync.start()
  await vi.waitFor(() => expect(statuses.at(-1)?.state).toBe('idle'))
  expect(fake.channels).toHaveLength(1)
  expect(fake.channels[0].name).toBe(`sync:${USER}`)
  expect(fake.channels[0].handlers.map((h) => h.filter.table)).toEqual(['tasks', 'task_overrides', 'ics_feeds'])
  expect(fake.channels[0].handlers[0].filter.filter).toBe(`user_id=eq.${USER}`)

  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] })
  fake.seed('tasks', [remoteTask('rt', iso(1000))])
  const before = fake.selectCalls
  fake.fire('tasks')
  fake.fire('tasks')
  vi.advanceTimersByTime(299)
  expect(fake.selectCalls).toBe(before)
  vi.advanceTimersByTime(1)
  vi.useRealTimers()

  await vi.waitFor(async () => expect(await db.tasks.get('rt')).toBeDefined())
  expect(fake.selectCalls).toBe(before + 3)

  sync.stop()
  expect(fake.channels).toHaveLength(0)
})

test('local write schedules a debounced pushDirty while started', async () => {
  const sync = makeSync()
  sync.start()
  await vi.waitFor(() => expect(statuses.at(-1)?.state).toBe('idle'))

  const task = await createTask(taskInput, USER)
  await vi.waitFor(() => expect(fake.rows('tasks').map((r) => r.id)).toEqual([task.id]), { timeout: 2000 })
  sync.stop()
})

test('pushDirty on server error keeps rows dirty and reports error status', async () => {
  fake.upsertError = 'boom'
  const task = await createTask(taskInput, USER)

  await makeSync().pushDirty()

  expect((await db.tasks.get(task.id))?._dirty).toBe(1)
  expect(statuses.at(-1)).toMatchObject({ state: 'error', error: 'tasks: boom' })
})

test('syncOnce reports offline and skips the network when navigator.onLine is false', async () => {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
  await createTask(taskInput, USER)

  await makeSync().syncOnce()

  expect(statuses.map((s) => s.state)).toEqual(['offline'])
  expect(fake.upsertCalls).toHaveLength(0)
  expect(fake.selectCalls).toBe(0)
})

test('concurrent syncOnce calls coalesce into one follow-up run', async () => {
  let release!: () => void
  fake.upsertGate = new Promise<void>((r) => {
    release = r
  })
  await createTask(taskInput, USER)
  const sync = makeSync()

  const first = sync.syncOnce()
  await vi.waitFor(() => expect(fake.upsertCalls).toHaveLength(1))
  const second = sync.syncOnce()
  const third = sync.syncOnce()
  expect(third).toBe(second)
  fake.upsertGate = null
  release()
  await Promise.all([first, second, third])

  expect(statuses.filter((s) => s.state === 'syncing')).toHaveLength(2)
})
