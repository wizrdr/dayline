import { useMemo, useState } from 'react'
import { useCalendarEvents, useOverrides, useTasks } from '@/db/hooks'
import { formatDayTitle, todayISO } from '@/domain/dates'
import { materializeDay, nowAndNext } from '@/domain/recurrence'
import type { DayItem, ISODate, Task } from '@/domain/types'
import { useSession } from '@/features/auth/session'
import { TaskSheet } from '@/features/task-sheet/TaskSheet'
import { Button } from '@/ui'
import { moveItem, toggleDone } from './actions'
import { DateStrip } from './DateStrip'
import { Timeline } from './Timeline'
import { UntimedList } from './UntimedList'
import { useNowMinutes } from './useNowMinutes'

interface SheetTarget {
  task: Task | null
  item: DayItem | null
}

export function DayPage() {
  const today = todayISO()
  const [date, setDate] = useState<ISODate>(today)
  const [sheet, setSheet] = useState<SheetTarget>({ task: null, item: null })
  const [sheetOpen, setSheetOpen] = useState(false)
  const userId = useSession().user?.id ?? null

  const tasks = useTasks()
  const overrides = useOverrides()
  const events = useCalendarEvents(date)
  const items = useMemo(() => materializeDay(tasks, overrides, date), [tasks, overrides, date])
  const untimed = items.filter((i) => i.start_min === null)
  const isToday = date === today

  const open = (task: Task | null, item: DayItem | null) => {
    setSheet({ task, item })
    setSheetOpen(true)
  }
  const onToggleDone = (item: DayItem) => {
    if (userId) void toggleDone(item, overrides, userId)
  }
  const onMove = (item: DayItem, startMin: number) => {
    if (userId) void moveItem(item, startMin, overrides, userId)
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-bg">
      <header className="flex items-center justify-between px-4 pb-1 pt-3">
        <h1 className="text-xl font-semibold text-text">{formatDayTitle(date, today)}</h1>
        {!isToday && (
          <Button variant="ghost" size="sm" onClick={() => setDate(today)}>
            Сегодня
          </Button>
        )}
      </header>
      <DateStrip date={date} onChange={setDate} />
      {isToday && <StatusLine items={items} />}
      <UntimedList items={untimed} onOpen={(item) => open(item.task, item)} onToggleDone={onToggleDone} />
      <div className="min-h-0 flex-1">
        <Timeline
          date={date}
          items={items}
          events={events}
          onOpen={(item) => open(item.task, item)}
          onToggleDone={onToggleDone}
          onMove={onMove}
        />
      </div>
      <button
        type="button"
        aria-label="Новая задача"
        onClick={() => open(null, null)}
        className="fixed right-4 z-30 flex size-14 items-center justify-center rounded-full bg-accent text-accent-fg shadow-card transition-transform duration-fast active:scale-95"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 72px)' }}
      >
        <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth={2.2} aria-hidden>
          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
        </svg>
      </button>
      <TaskSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        task={sheet.task}
        date={date}
        item={sheet.item}
      />
    </div>
  )
}

function StatusLine({ items }: { items: DayItem[] }) {
  const { current, next } = nowAndNext(items, useNowMinutes())
  const parts = [current && `Сейчас: ${current.task.title}`, next && `Далее: ${next.task.title}`].filter(Boolean)
  if (parts.length === 0) return null
  return <p className="truncate px-4 pb-2 text-sm text-muted">{parts.join(' · ')}</p>
}

export default DayPage
