export type RemoteRow = Record<string, unknown>
export type RemoteError = { message: string } | null

export interface SyncQuery {
  gt(column: string, value: string): {
    order(column: string, opts: { ascending: boolean }): {
      limit(n: number): PromiseLike<{ data: RemoteRow[] | null; error: RemoteError }>
    }
  }
}

export interface SyncTable {
  upsert(rows: RemoteRow[], opts: { onConflict: string }): PromiseLike<{ error: RemoteError }>
  select(columns: string): SyncQuery
}

export interface PostgresChangesFilter {
  event: '*'
  schema: 'public'
  table: string
  filter?: string
}

export interface SyncChannel {
  on(type: 'postgres_changes', filter: PostgresChangesFilter, cb: () => void): SyncChannel
  subscribe(): unknown
}

export interface SyncClient {
  from(table: string): SyncTable
  channel(name: string): SyncChannel
  removeChannel(channel: SyncChannel): unknown
}
