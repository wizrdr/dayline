import { onLocalWrite } from '../db/events'
import type { DaylineDB, LocalRow } from '../db/schema'
import { SYNCED_TABLES, type SyncMeta, type SyncedTable } from '../domain/types'
import type { RemoteRow, SyncChannel, SyncClient } from './client'

export type SyncStatus = {
  state: 'idle' | 'syncing' | 'offline' | 'error'
  lastSyncAt: string | null
  error?: string
}

export interface Sync {
  syncOnce(): Promise<void>
  pushDirty(): Promise<void>
  pull(): Promise<void>
  start(): void
  stop(): void
}

export interface SyncOptions {
  client: SyncClient
  db: DaylineDB
  userId: string
  onStatus?: (s: SyncStatus) => void
}

const EPOCH = '1970-01-01T00:00:00.000Z'
const PUSH_BATCH = 200
const PULL_PAGE = 500
const REALTIME_DEBOUNCE_MS = 300
const LOCAL_WRITE_DEBOUNCE_MS = 500
const PERIODIC_MS = 60_000

type SyncRow = LocalRow<SyncMeta>

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

function isRemoteSyncRow(row: RemoteRow): row is RemoteRow & SyncMeta {
  return typeof row.id === 'string' && typeof row.updated_at === 'string'
}

function toRemote(row: SyncRow): RemoteRow {
  const { _dirty, ...rest } = row
  return rest
}

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}

function debounce(fn: () => void, ms: number): { call: () => void; cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null
  const cancel = () => {
    if (timer !== null) clearTimeout(timer)
    timer = null
  }
  return {
    call: () => {
      cancel()
      timer = setTimeout(() => {
        timer = null
        fn()
      }, ms)
    },
    cancel,
  }
}

export function createSync(opts: SyncOptions): Sync {
  const { client, db, userId, onStatus } = opts
  let status: SyncStatus = { state: 'idle', lastSyncAt: null }

  function setStatus(patch: Partial<SyncStatus>): void {
    status = { ...status, ...patch }
    onStatus?.(status)
  }

  function table(name: SyncedTable) {
    return db.table<SyncRow, string>(name)
  }

  async function pushTable(name: SyncedTable): Promise<void> {
    const t = table(name)
    const dirty = await t.where('_dirty').equals(1).toArray()
    for (let i = 0; i < dirty.length; i += PUSH_BATCH) {
      const batch = dirty.slice(i, i + PUSH_BATCH)
      const { error } = await client.from(name).upsert(batch.map(toRemote), { onConflict: 'id' })
      if (error) throw new Error(error.message)
      await markClean(t, batch)
    }
  }

  // A row edited while the upsert was in flight has a newer updated_at and must stay dirty.
  async function markClean(t: ReturnType<typeof table>, pushed: SyncRow[]): Promise<void> {
    await db.transaction('rw', t, async () => {
      for (const row of pushed) {
        const current = await t.get(row.id)
        if (current && current.updated_at === row.updated_at) await t.update(row.id, { _dirty: 0 })
      }
    })
  }

  async function pullTable(name: SyncedTable): Promise<void> {
    const t = table(name)
    const key = `last_pull:${name}`
    let since = (await db.meta.get(key))?.value ?? EPOCH
    for (;;) {
      const { data, error } = await client
        .from(name)
        .select('*')
        .gt('updated_at', since)
        .order('updated_at', { ascending: true })
        .limit(PULL_PAGE)
      if (error) throw new Error(error.message)
      const rows = (data ?? []).filter(isRemoteSyncRow)
      if (rows.length === 0) return
      since = rows.reduce((max, r) => (r.updated_at > max ? r.updated_at : max), since)
      await db.transaction('rw', t, db.meta, async () => {
        for (const remote of rows) await applyRemote(t, remote)
        await db.meta.put({ key, value: since })
      })
      if (rows.length < PULL_PAGE) return
    }
  }

  async function applyRemote(t: ReturnType<typeof table>, remote: RemoteRow & SyncMeta): Promise<void> {
    const local = await t.get(remote.id)
    if (local && local._dirty === 1 && local.updated_at >= remote.updated_at) return
    await t.put({ ...remote, _dirty: 0 })
  }

  async function forEachTable(fn: (name: SyncedTable) => Promise<void>): Promise<string[]> {
    const errors: string[] = []
    for (const name of SYNCED_TABLES) {
      try {
        await fn(name)
      } catch (e) {
        errors.push(`${name}: ${errorMessage(e)}`)
      }
    }
    return errors
  }

  function finish(errors: string[]): void {
    if (errors.length > 0) setStatus({ state: 'error', error: errors.join('; ') })
    else setStatus({ state: 'idle', lastSyncAt: new Date().toISOString(), error: undefined })
  }

  async function guarded(steps: Array<(name: SyncedTable) => Promise<void>>): Promise<void> {
    if (isOffline()) {
      setStatus({ state: 'offline' })
      return
    }
    setStatus({ state: 'syncing' })
    const errors: string[] = []
    for (const step of steps) errors.push(...(await forEachTable(step)))
    finish(errors)
  }

  const pushDirty = () => guarded([pushTable])
  const pull = () => guarded([pullTable])

  let current: Promise<void> | null = null
  let queued: Promise<void> | null = null

  function syncOnce(): Promise<void> {
    if (!current) {
      current = guarded([pushTable, pullTable]).finally(() => {
        current = null
      })
      return current
    }
    queued ??= current.then(() => {
      queued = null
      return syncOnce()
    })
    return queued
  }

  const realtimePull = debounce(() => void pull(), REALTIME_DEBOUNCE_MS)
  const localFlush = debounce(() => void pushDirty(), LOCAL_WRITE_DEBOUNCE_MS)
  const onOnline = () => void syncOnce()
  const onVisibility = () => {
    if (document.visibilityState === 'visible') void syncOnce()
  }

  let channel: SyncChannel | null = null
  let interval: ReturnType<typeof setInterval> | null = null
  let offLocalWrite: (() => void) | null = null

  function subscribeRealtime(): void {
    let ch = client.channel(`sync:${userId}`)
    for (const name of SYNCED_TABLES) {
      ch = ch.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: name, filter: `user_id=eq.${userId}` },
        realtimePull.call,
      )
    }
    ch.subscribe()
    channel = ch
  }

  function start(): void {
    if (interval !== null) return
    void syncOnce()
    try {
      subscribeRealtime()
    } catch (e) {
      setStatus({ state: 'error', error: `realtime: ${errorMessage(e)}` })
    }
    window.addEventListener('online', onOnline)
    document.addEventListener('visibilitychange', onVisibility)
    interval = setInterval(() => void syncOnce(), PERIODIC_MS)
    offLocalWrite = onLocalWrite(localFlush.call)
  }

  function stop(): void {
    if (interval !== null) clearInterval(interval)
    interval = null
    realtimePull.cancel()
    localFlush.cancel()
    window.removeEventListener('online', onOnline)
    document.removeEventListener('visibilitychange', onVisibility)
    offLocalWrite?.()
    offLocalWrite = null
    if (channel) client.removeChannel(channel)
    channel = null
  }

  return { syncOnce, pushDirty, pull, start, stop }
}
