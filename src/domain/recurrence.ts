import { isoWeekday } from './dates'
import type { DayItem, ISODate, Task, TaskOverride } from './types'

export function isActiveRow(row: { deleted_at: string | null }): boolean {
  return row.deleted_at === null
}

export function occursOn(task: Task, date: ISODate): boolean {
  if (!isActiveRow(task)) return false
  if (task.kind === 'single') return task.date === date
  if (task.start_date === null || task.start_date > date) return false
  if (task.end_date !== null && date > task.end_date) return false
  return (task.weekdays ?? []).includes(isoWeekday(date))
}

export function overrideFor(
  overrides: TaskOverride[],
  seriesId: string,
  date: ISODate,
): TaskOverride | null {
  let best: TaskOverride | null = null
  for (const o of overrides) {
    if (!isActiveRow(o) || o.series_id !== seriesId || o.date !== date) continue
    if (best === null || o.updated_at > best.updated_at) best = o
  }
  return best
}

export function materializeDay(
  tasks: Task[],
  overrides: TaskOverride[],
  date: ISODate,
): DayItem[] {
  const items: DayItem[] = []
  for (const task of tasks) {
    if (!occursOn(task, date)) continue
    const item = task.kind === 'single' ? singleItem(task, date) : seriesItem(task, overrides, date)
    if (item !== null) items.push(item)
  }
  return items.sort(compareItems)
}

function singleItem(task: Task, date: ISODate): DayItem {
  return {
    key: task.id,
    task,
    override: null,
    date,
    start_min: task.start_min,
    duration_min: task.duration_min,
    done: task.done,
  }
}

function seriesItem(task: Task, overrides: TaskOverride[], date: ISODate): DayItem | null {
  const override = overrideFor(overrides, task.id, date)
  if (override?.skipped) return null
  return {
    key: `${task.id}:${date}`,
    task,
    override,
    date,
    start_min: override?.start_min ?? task.start_min,
    duration_min: override?.duration_min ?? task.duration_min,
    done: override?.done ?? false,
  }
}

function compareItems(a: DayItem, b: DayItem): number {
  if (a.start_min === null && b.start_min !== null) return 1
  if (a.start_min !== null && b.start_min === null) return -1
  if (a.start_min !== null && b.start_min !== null && a.start_min !== b.start_min) {
    return a.start_min - b.start_min
  }
  return a.task.title.localeCompare(b.task.title)
}

export function inboxItems(tasks: Task[]): Task[] {
  return tasks
    .filter((t) => isActiveRow(t) && t.kind === 'single' && t.date === null && !t.done)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
}

export function nowAndNext(
  items: DayItem[],
  nowMin: number,
): { current: DayItem | null; next: DayItem | null } {
  let current: DayItem | null = null
  let next: DayItem | null = null
  for (const item of items) {
    if (item.done || item.start_min === null) continue
    const start = item.start_min
    if (start <= nowMin && nowMin < start + item.duration_min) {
      if (current === null || start > (current.start_min ?? -1)) current = item
    } else if (start > nowMin && (next === null || start < (next.start_min ?? Infinity))) {
      next = item
    }
  }
  return { current, next }
}

export function remindersDue(
  tasks: Task[],
  overrides: TaskOverride[],
  date: ISODate,
  minute: number,
): DayItem[] {
  return materializeDay(tasks, overrides, date).filter((item) => {
    const before = item.task.remind_min_before
    if (item.done || before === null || item.start_min === null) return false
    return item.start_min - before === minute
  })
}
