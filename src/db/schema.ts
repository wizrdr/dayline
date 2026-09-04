import Dexie, { type Table } from 'dexie'
import type { CalendarEvent, IcsFeed, RowOf, SyncedTable, Task, TaskOverride } from '../domain/types'

export type LocalRow<T> = T & { _dirty: 0 | 1 }

export interface MetaRow {
  key: string
  value: string
}

export class DaylineDB extends Dexie {
  tasks!: Table<LocalRow<Task>, string>
  task_overrides!: Table<LocalRow<TaskOverride>, string>
  ics_feeds!: Table<LocalRow<IcsFeed>, string>
  calendar_events!: Table<CalendarEvent, string>
  meta!: Table<MetaRow, string>

  constructor(name = 'dayline') {
    super(name)
    this.version(1).stores({
      tasks: 'id, date, kind, _dirty, updated_at, deleted_at',
      task_overrides: 'id, series_id, date, [series_id+date], _dirty, updated_at',
      ics_feeds: 'id, _dirty, updated_at',
      calendar_events: 'id, feed_id, date',
      meta: 'key',
    })
  }

  synced<T extends SyncedTable>(table: T): Table<LocalRow<RowOf<T>>, string> {
    return this.table<LocalRow<RowOf<T>>, string>(table)
  }
}

export const db = new DaylineDB()
