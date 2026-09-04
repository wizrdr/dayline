export type ISODate = string
export type ISOTime = string
export type TaskKind = 'single' | 'series'
export type TaskColor = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7
export type IconName =
  | 'cards' | 'box' | 'globe' | 'bowl' | 'book' | 'briefcase' | 'dumbbell' | 'run' | 'code' | 'phone'
  | 'mail' | 'cart' | 'home' | 'heart' | 'coffee' | 'music' | 'pen' | 'users' | 'brain' | 'sun'
  | 'moon' | 'star' | 'bell' | 'flag' | 'check'

export interface SyncMeta {
  id: string
  user_id: string
  updated_at: ISOTime
  deleted_at: ISOTime | null
}

export interface Task extends SyncMeta {
  title: string
  note: string
  color: TaskColor
  icon: IconName | null
  date: ISODate | null
  start_min: number | null
  duration_min: number
  done: boolean
  kind: TaskKind
  weekdays: Weekday[] | null
  start_date: ISODate | null
  end_date: ISODate | null
  remind_min_before: number | null
}

export interface TaskOverride extends SyncMeta {
  series_id: string
  date: ISODate
  done: boolean | null
  skipped: boolean
  start_min: number | null
  duration_min: number | null
}

export interface IcsFeed extends SyncMeta {
  name: string
  url: string
  color: TaskColor
}

export interface PushSubscriptionRow {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
  tz: string
  updated_at: ISOTime
}

export interface CalendarEvent {
  id: string
  feed_id: string
  title: string
  date: ISODate
  start_min: number
  duration_min: number
  all_day: boolean
}

export interface DayItem {
  key: string
  task: Task
  override: TaskOverride | null
  date: ISODate
  start_min: number | null
  duration_min: number
  done: boolean
}

export const SYNCED_TABLES = ['tasks', 'task_overrides', 'ics_feeds'] as const
export type SyncedTable = (typeof SYNCED_TABLES)[number]
export type RowOf<T extends SyncedTable> = T extends 'tasks'
  ? Task
  : T extends 'task_overrides'
    ? TaskOverride
    : IcsFeed
