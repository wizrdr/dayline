import { useState } from 'react'
import { useOverrides } from '@/db/hooks'
import { createTask, patchRow, softDeleteRow } from '@/db/repo'
import type { DayItem, ISODate, Task } from '@/domain/types'
import { useSession } from '@/features/auth/session'
import { skipOccurrence } from '@/features/day/actions'
import { Button, Sheet, suggestIcon } from '@/ui'
import { TaskForm } from './TaskForm'
import { diffDraft, useTaskDraft } from './useTaskDraft'

export interface TaskSheetProps {
  open: boolean
  onClose: () => void
  task: Task | null
  date: ISODate | null
  item?: DayItem | null
}

export function TaskSheet({ open, onClose, task, date, item = null }: TaskSheetProps) {
  const userId = useSession().user?.id ?? null
  const overrides = useOverrides()
  const { draft, set, setRepeat } = useTaskDraft(task, date, open)
  const [busy, setBusy] = useState(false)
  const canSave = draft.title.trim().length > 0 && !busy
  const isOccurrence = task?.kind === 'series' && item !== null

  async function run(action: () => Promise<void>) {
    setBusy(true)
    try {
      await action()
      onClose()
    } finally {
      setBusy(false)
    }
  }

  function save() {
    if (!userId) return
    const title = draft.title.trim()
    const clean = { ...draft, title, icon: draft.icon ?? suggestIcon(title) }
    void run(async () => {
      if (task) {
        const patch = diffDraft(clean, task)
        if (Object.keys(patch).length > 0) await patchRow('tasks', task.id, patch)
      } else {
        await createTask(clean, userId)
      }
    })
  }

  function remove() {
    if (!task || !window.confirm('Удалить задачу?')) return
    void run(() => softDeleteRow('tasks', task.id))
  }

  function skip() {
    if (!item || !userId) return
    void run(() => skipOccurrence(item, overrides, userId))
  }

  const footer = (
    <div className="flex flex-col gap-2">
      <Button variant="primary" full disabled={!canSave} loading={busy} onClick={save}>
        Сохранить
      </Button>
      {task && (
        <Button variant="danger" full disabled={busy} onClick={remove}>
          Удалить
        </Button>
      )}
    </div>
  )

  return (
    <Sheet open={open} onClose={onClose} title={task ? 'Задача' : 'Новая задача'} footer={footer}>
      <TaskForm draft={draft} set={set} setRepeat={setRepeat} />
      {isOccurrence && (
        <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
          <p className="text-sm text-muted">
            Время и длительность меняются для всей серии. Перенести на один день можно перетаскиванием на
            таймлайне.
          </p>
          <Button variant="soft" size="sm" disabled={busy} onClick={skip}>
            Пропустить в этот день
          </Button>
        </div>
      )}
    </Sheet>
  )
}

export default TaskSheet
