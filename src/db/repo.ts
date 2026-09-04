import {
  SYNCED_TABLES,
  type CalendarEvent,
  type IcsFeed,
  type ISODate,
  type RowOf,
  type SyncMeta,
  type SyncedTable,
  type Task,
  type TaskOverride,
} from '../domain/types'
import { emitLocalWrite } from './events'
import { db, type LocalRow } from './schema'

export type NewRow<T extends SyncMeta> = Omit<T, keyof SyncMeta>

const USER_ID_KEY = 'user_id'
const DAY_MS = 86_400_000

export function newId(): string {
  return crypto.randomUUID()
}

export function nowISO(): string {
  return new Date().toISOString()
}

function stamp<T extends SyncMeta>(row: T): LocalRow<T> {
  return { ...row, updated_at: nowISO(), _dirty: 1 }
}

async function store<T extends SyncedTable>(table: T, row: RowOf<T>): Promise<LocalRow<RowOf<T>>> {
  const stamped = stamp(row)
  await db.synced(table).put(stamped)
  emitLocalWrite()
  return stamped
}

export async function putRow<T extends SyncedTable>(table: T, row: RowOf<T>): Promise<void> {
  await store(table, row)
}

export async function patchRow<T extends SyncedTable>(
  table: T,
  id: string,
  patch: Partial<RowOf<T>>,
): Promise<void> {
  const t = db.synced(table)
  await db.transaction('rw', t, async () => {
    const current = await t.get(id)
    if (!current) throw new Error(`${table}/${id} not found`)
    await t.put(stamp({ ...current, ...patch }))
  })
  emitLocalWrite()
}

export async function softDeleteRow(table: SyncedTable, id: string): Promise<void> {
  const t = db.table<LocalRow<SyncMeta>, string>(table)
  const now = nowISO()
  const updated = await t.update(id, { deleted_at: now, updated_at: now, _dirty: 1 })
  if (updated === 0) throw new Error(`${table}/${id} not found`)
  emitLocalWrite()
}

function withMeta<T extends SyncMeta>(input: NewRow<T>, userId: string): T {
  const meta: SyncMeta = { id: newId(), user_id: userId, updated_at: nowISO(), deleted_at: null }
  return { ...input, ...meta } as T
}

export async function createTask(input: NewRow<Task>, userId: string): Promise<Task> {
  return store('tasks', withMeta<Task>(input, userId))
}

export async function createOverride(input: NewRow<TaskOverride>, userId: string): Promise<TaskOverride> {
  return store('task_overrides', withMeta<TaskOverride>(input, userId))
}

export async function createFeed(input: NewRow<IcsFeed>, userId: string): Promise<IcsFeed> {
  return store('ics_feeds', withMeta<IcsFeed>(input, userId))
}

export async function getUserId(): Promise<string | null> {
  return (await db.meta.get(USER_ID_KEY))?.value ?? null
}

export async function setUserId(id: string): Promise<void> {
  await db.meta.put({ key: USER_ID_KEY, value: id })
}

export async function clearAllLocal(): Promise<void> {
  await db.transaction('rw', db.tables, () => Promise.all(db.tables.map((t) => t.clear())))
}

export async function purgeDeletedOlderThan(days: number): Promise<number> {
  const cutoff = new Date(Date.now() - days * DAY_MS).toISOString()
  let removed = 0
  for (const table of SYNCED_TABLES) {
    removed += await db
      .synced(table)
      .filter((r) => r._dirty === 0 && r.deleted_at !== null && r.deleted_at < cutoff)
      .delete()
  }
  return removed
}

export function listTasks(): Promise<Task[]> {
  return db.tasks.filter((r) => r.deleted_at === null).toArray()
}

export function listOverrides(): Promise<TaskOverride[]> {
  return db.task_overrides.filter((r) => r.deleted_at === null).toArray()
}

export function listFeeds(): Promise<IcsFeed[]> {
  return db.ics_feeds.filter((r) => r.deleted_at === null).toArray()
}

export function listCalendarEvents(date: ISODate): Promise<CalendarEvent[]> {
  return db.calendar_events.where('date').equals(date).toArray()
}
