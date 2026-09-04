import type { PostgresChangesFilter, RemoteRow, SyncChannel, SyncClient, SyncTable } from './client'

export class FakeChannel implements SyncChannel {
  readonly handlers: Array<{ filter: PostgresChangesFilter; cb: () => void }> = []
  subscribed = false

  constructor(readonly name: string) {}

  on(_type: 'postgres_changes', filter: PostgresChangesFilter, cb: () => void): SyncChannel {
    this.handlers.push({ filter, cb })
    return this
  }

  subscribe(): unknown {
    this.subscribed = true
    return this
  }

  fire(table: string): void {
    for (const h of this.handlers) if (h.filter.table === table) h.cb()
  }
}

export class FakeSupabase implements SyncClient {
  private readonly store = new Map<string, Map<string, RemoteRow>>()
  readonly upsertCalls: Array<{ table: string; rows: RemoteRow[] }> = []
  selectCalls = 0
  channels: FakeChannel[] = []
  upsertGate: Promise<void> | null = null
  upsertError: string | null = null

  private tableMap(table: string): Map<string, RemoteRow> {
    let m = this.store.get(table)
    if (!m) {
      m = new Map()
      this.store.set(table, m)
    }
    return m
  }

  seed(table: string, rows: readonly object[]): void {
    for (const r of rows) {
      const row: RemoteRow = { ...r }
      this.tableMap(table).set(String(row.id), row)
    }
  }

  rows(table: string): RemoteRow[] {
    return [...this.tableMap(table).values()]
  }

  from(table: string): SyncTable {
    return {
      upsert: async (rows) => {
        this.upsertCalls.push({ table, rows })
        if (this.upsertGate) await this.upsertGate
        if (this.upsertError) return { error: { message: this.upsertError } }
        this.seed(table, rows)
        return { error: null }
      },
      select: () => ({
        gt: (column, value) => ({
          order: (orderCol, { ascending }) => ({
            limit: async (n) => {
              this.selectCalls += 1
              const data = this.rows(table)
                .filter((r) => String(r[column]) > value)
                .sort((a, b) => {
                  const cmp = String(a[orderCol]).localeCompare(String(b[orderCol]))
                  return ascending ? cmp : -cmp
                })
                .slice(0, n)
              return { data, error: null }
            },
          }),
        }),
      }),
    }
  }

  channel(name: string): SyncChannel {
    const ch = new FakeChannel(name)
    this.channels.push(ch)
    return ch
  }

  removeChannel(channel: SyncChannel): unknown {
    this.channels = this.channels.filter((c) => c !== channel)
    return null
  }

  fire(table: string): void {
    for (const ch of this.channels) ch.fire(table)
  }
}
