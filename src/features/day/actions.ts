import { createOverride, patchRow } from '@/db/repo'
import { overrideFor } from '@/domain/recurrence'
import type { DayItem, TaskOverride } from '@/domain/types'

type OverridePatch = Partial<Pick<TaskOverride, 'done' | 'skipped' | 'start_min' | 'duration_min'>>

export async function upsertOverride(
  item: DayItem,
  overrides: TaskOverride[],
  patch: OverridePatch,
  userId: string,
): Promise<void> {
  const existing = overrideFor(overrides, item.task.id, item.date)
  if (existing) {
    await patchRow('task_overrides', existing.id, patch)
    return
  }
  await createOverride(
    {
      series_id: item.task.id,
      date: item.date,
      done: null,
      skipped: false,
      start_min: null,
      duration_min: null,
      ...patch,
    },
    userId,
  )
}

export async function toggleDone(item: DayItem, overrides: TaskOverride[], userId: string): Promise<void> {
  if (item.task.kind === 'single') {
    await patchRow('tasks', item.task.id, { done: !item.done })
    return
  }
  await upsertOverride(item, overrides, { done: !item.done }, userId)
}

export async function moveItem(
  item: DayItem,
  startMin: number,
  overrides: TaskOverride[],
  userId: string,
): Promise<void> {
  if (item.task.kind === 'single') {
    await patchRow('tasks', item.task.id, { start_min: startMin })
    return
  }
  await upsertOverride(item, overrides, { start_min: startMin }, userId)
}

export async function skipOccurrence(item: DayItem, overrides: TaskOverride[], userId: string): Promise<void> {
  await upsertOverride(item, overrides, { skipped: true }, userId)
}
