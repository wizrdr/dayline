import { beforeEach, expect, test, vi } from 'vitest'
import type { Task } from '../domain/types'
import { onLocalWrite } from './events'
import {
  clearAllLocal,
  createFeed,
  createOverride,
  createTask,
  getUserId,
  listTasks,
  patchRow,
  purgeDeletedOlderThan,
  putRow,
  setUserId,
  softDeleteRow,
} from './repo'
import { db } from './schema'

const taskInput = {
  title: 'Write tests',
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

beforeEach(async () => {
  await db.delete()
  await db.open()
})

test('createTask stores a dirty row with sync meta', async () => {
  const task = await createTask(taskInput, 'u1')
  const stored = await db.tasks.get(task.id)
  expect(stored).toMatchObject({ ...taskInput, user_id: 'u1', deleted_at: null, _dirty: 1 })
  expect(stored?.updated_at).toBe(task.updated_at)
})

test('createOverride and createFeed store rows', async () => {
  const o = await createOverride(
    { series_id: 's1', date: '2026-09-04', done: true, skipped: false, start_min: null, duration_min: null },
    'u1',
  )
  const f = await createFeed({ name: 'Work', url: 'https://x/cal.ics', color: 2 }, 'u1')
  expect((await db.task_overrides.get(o.id))?._dirty).toBe(1)
  expect((await db.ics_feeds.get(f.id))?.name).toBe('Work')
})

test('putRow overwrites updated_at and marks dirty', async () => {
  const task = await createTask(taskInput, 'u1')
  await db.tasks.update(task.id, { _dirty: 0 })
  await putRow('tasks', { ...task, updated_at: '2000-01-01T00:00:00.000Z' })
  const stored = await db.tasks.get(task.id)
  expect(stored?._dirty).toBe(1)
  expect((stored?.updated_at ?? '') > '2000-01-01T00:00:00.000Z').toBe(true)
})

test('patchRow merges, bumps updated_at, marks dirty', async () => {
  const task = await createTask(taskInput, 'u1')
  await db.tasks.update(task.id, { _dirty: 0, updated_at: '2000-01-01T00:00:00.000Z' })
  await patchRow('tasks', task.id, { title: 'Edited', done: true })
  const stored = await db.tasks.get(task.id)
  expect(stored).toMatchObject({ title: 'Edited', done: true, note: '', _dirty: 1 })
  expect((stored?.updated_at ?? '') > '2000-01-01T00:00:00.000Z').toBe(true)
})

test('patchRow throws on unknown id', async () => {
  await expect(patchRow('tasks', 'missing', { title: 'x' })).rejects.toThrow('not found')
})

test('softDeleteRow sets deleted_at and list excludes it', async () => {
  const task = await createTask(taskInput, 'u1')
  await softDeleteRow('tasks', task.id)
  const stored = await db.tasks.get(task.id)
  expect(stored?.deleted_at).not.toBeNull()
  expect(stored?._dirty).toBe(1)
  expect(await listTasks()).toEqual([])
})

test('every write emits a local-write event', async () => {
  const cb = vi.fn()
  const off = onLocalWrite(cb)
  const task = await createTask(taskInput, 'u1')
  await patchRow('tasks', task.id, { title: 'x' })
  await softDeleteRow('tasks', task.id)
  off()
  await createTask(taskInput, 'u1')
  expect(cb).toHaveBeenCalledTimes(3)
})

test('user id round-trips via meta', async () => {
  expect(await getUserId()).toBeNull()
  await setUserId('u1')
  expect(await getUserId()).toBe('u1')
})

test('clearAllLocal wipes all tables and meta', async () => {
  await createTask(taskInput, 'u1')
  await setUserId('u1')
  await db.calendar_events.put({
    id: 'e1',
    feed_id: 'f1',
    title: 'Ev',
    date: '2026-09-04',
    start_min: 0,
    duration_min: 30,
    all_day: false,
  })
  await clearAllLocal()
  expect(await db.tasks.count()).toBe(0)
  expect(await db.calendar_events.count()).toBe(0)
  expect(await getUserId()).toBeNull()
})

test('purgeDeletedOlderThan removes only old clean soft-deleted rows', async () => {
  const old = new Date(Date.now() - 40 * 86_400_000).toISOString()
  const fresh = new Date(Date.now() - 1 * 86_400_000).toISOString()
  const base = { ...taskInput, user_id: 'u1', updated_at: old }
  await db.tasks.bulkPut([
    { ...base, id: 'old-clean', deleted_at: old, _dirty: 0 },
    { ...base, id: 'old-dirty', deleted_at: old, _dirty: 1 },
    { ...base, id: 'fresh-clean', deleted_at: fresh, _dirty: 0 },
    { ...base, id: 'alive', deleted_at: null, _dirty: 0 },
  ])
  expect(await purgeDeletedOlderThan(30)).toBe(1)
  expect((await db.tasks.toArray()).map((t) => t.id).sort()).toEqual(['alive', 'fresh-clean', 'old-dirty'])
})
