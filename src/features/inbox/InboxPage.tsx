import { useState } from 'react'
import { useTasks } from '@/db/hooks'
import { patchRow } from '@/db/repo'
import { todayISO } from '@/domain/dates'
import { inboxItems } from '@/domain/recurrence'
import type { Task } from '@/domain/types'
import { TaskSheet } from '@/features/task-sheet/TaskSheet'
import { Button, Card, TaskIcon, cn, taskSoftBgClass, taskTextClass } from '@/ui'

type SheetState = { open: false } | { open: true; task: Task | null }

export function InboxPage() {
  const items = inboxItems(useTasks())
  const [sheet, setSheet] = useState<SheetState>({ open: false })
  const close = () => setSheet({ open: false })

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-[480px] flex-col gap-4 px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+144px)]">
        <header className="flex items-baseline gap-2">
          <h1 className="text-2xl font-semibold text-text">Инбокс</h1>
          <span className="text-muted">{items.length}</span>
        </header>

        {items.length === 0 ? (
          <p className="py-16 text-center text-muted">Пусто. Сюда попадают задачи без даты.</p>
        ) : (
          <Card padded={false} className="divide-y divide-border">
            {items.map((task) => (
              <InboxRow key={task.id} task={task} onOpen={() => setSheet({ open: true, task })} />
            ))}
          </Card>
        )}
      </div>

      <button
        type="button"
        aria-label="Новая задача"
        onClick={() => setSheet({ open: true, task: null })}
        className="fixed right-[max(1rem,calc(50%-224px))] bottom-[calc(env(safe-area-inset-bottom)+72px)] flex size-14 items-center justify-center rounded-full bg-accent text-3xl leading-none text-accent-fg shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:brightness-95"
      >
        +
      </button>

      <TaskSheet open={sheet.open} onClose={close} task={sheet.open ? sheet.task : null} date={null} />
    </div>
  )
}

function InboxRow({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const toToday = () => void patchRow('tasks', task.id, { date: todayISO() })
  return (
    <div className="flex items-center gap-3 pr-2 pl-4">
      <button
        type="button"
        onClick={onOpen}
        className="flex min-h-14 min-w-0 flex-1 items-center gap-3 py-3 text-left"
      >
        <span
          aria-hidden
          className={cn('flex size-[34px] shrink-0 items-center justify-center rounded-md', taskSoftBgClass[task.color], taskTextClass[task.color])}
        >
          <TaskIcon name={task.icon} size={20} />
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-text">{task.title}</span>
          {task.note && <span className="truncate text-sm text-faint">{task.note}</span>}
        </span>
      </button>
      <Button variant="ghost" size="sm" onClick={toToday} className="shrink-0 text-accent">
        Сегодня
      </Button>
    </div>
  )
}
