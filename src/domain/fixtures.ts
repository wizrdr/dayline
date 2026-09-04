import type { Task, TaskOverride } from './types.ts'

let seq = 0

export function mkTask(partial: Partial<Task> = {}): Task {
  seq += 1
  return {
    id: `task-${seq}`,
    user_id: 'user-1',
    updated_at: '2026-01-01T00:00:00.000Z',
    deleted_at: null,
    title: `Task ${seq}`,
    note: '',
    color: 1,
    icon: null,
    date: null,
    start_min: null,
    duration_min: 60,
    done: false,
    kind: 'single',
    weekdays: null,
    start_date: null,
    end_date: null,
    remind_min_before: null,
    ...partial,
  }
}

export function mkOverride(partial: Partial<TaskOverride> = {}): TaskOverride {
  seq += 1
  return {
    id: `override-${seq}`,
    user_id: 'user-1',
    updated_at: '2026-01-01T00:00:00.000Z',
    deleted_at: null,
    series_id: 'task-0',
    date: '2026-01-01',
    done: null,
    skipped: false,
    start_min: null,
    duration_min: null,
    ...partial,
  }
}
