import { useState } from 'react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useOverrides, useTasksState } from '@/db/hooks'
import { addDaysISO, formatDayTitle, fromISODate, snapMin, todayISO } from '@/domain/dates'
import type { DayItem, ISODate, Task } from '@/domain/types'
import { useSession } from '@/features/auth/session'
import { TaskSheet } from '@/features/task-sheet/TaskSheet'
import { Button } from '@/ui'
import { extendItem, moveItem, toggleDone } from './actions'
import { DateStrip } from './DateStrip'
import { DayContent } from './DayContent'
import { DayPager } from './DayPager'
import { useNowMinutes } from './useNowMinutes'
import { usePager } from './usePager'

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
  const nowMin = useNowMinutes()
  const { tasks, loaded } = useTasksState()
  const overrides = useOverrides()
  const isToday = date === today
  const pager = usePager({ date, onChange: setDate })

  const select = (next: ISODate) => {
    if (next === addDaysISO(date, 1)) pager.goNext()
    else if (next === addDaysISO(date, -1)) pager.goPrev()
    else setDate(next)
  }

  const open = (item: DayItem) => {
    setSheet({ task: item.task, item })
    setSheetOpen(true)
  }
  const actions = {
    onOpen: open,
    onToggleDone: (item: DayItem) => {
      if (userId) void toggleDone(item, overrides, userId)
    },
    onExtend: (item: DayItem) => {
      if (userId) void extendItem(item, 15, overrides, userId)
    },
    onStartNow: (item: DayItem) => {
      if (userId) void moveItem(item, snapMin(nowMin), overrides, userId)
    },
  }

  return (
    <div data-testid="day-root" className="relative flex h-full flex-col bg-bg">
      <div className="mx-auto w-full max-w-[480px] px-5">
        <header className="flex items-end justify-between pb-2 pt-4">
          <div className="flex flex-col gap-0.5">
            <h1 className="text-[28px] font-bold leading-none tracking-tight text-text">{formatDayTitle(date, today)}</h1>
            <span className="text-sm text-muted">{format(fromISODate(date), 'EEEE, d MMMM', { locale: ru })}</span>
          </div>
          {!isToday && (
            <Button variant="ghost" size="sm" onClick={() => select(today)}>
              Сегодня
            </Button>
          )}
        </header>
        <DateStrip date={date} onChange={select} />
      </div>
      {!loaded ? (
        <div className="mx-auto w-full max-w-[480px] px-5 pt-4">
          <DaySkeleton />
        </div>
      ) : (
        <DayPager
          date={date}
          pager={pager}
          renderDay={(d) => <DayContent date={d} today={today} nowMin={nowMin} tasks={tasks} overrides={overrides} {...actions} />}
        />
      )}
      <button
        type="button"
        aria-label="Новая задача"
        onClick={() => {
          setSheet({ task: null, item: null })
          setSheetOpen(true)
        }}
        className="fixed right-[max(1rem,calc(50%-224px))] z-30 flex size-14 items-center justify-center rounded-full bg-accent text-accent-fg shadow-card transition-transform duration-fast active:scale-95"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 72px)' }}
      >
        <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth={2.2} aria-hidden>
          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
        </svg>
      </button>
      <TaskSheet open={sheetOpen} onClose={() => setSheetOpen(false)} task={sheet.task} date={date} item={sheet.item} />
    </div>
  )
}

function DaySkeleton() {
  return (
    <div data-testid="day-skeleton" aria-busy className="flex flex-col gap-4">
      <div className="h-36 rounded-lg bg-surface-raised" />
      <div className="flex flex-col gap-3 pt-2">
        <div className="h-3 w-24 rounded-full bg-surface-raised" />
        <div className="h-12 rounded-md bg-surface-raised" />
        <div className="h-12 rounded-md bg-surface-raised" />
        <div className="h-12 rounded-md bg-surface-raised" />
      </div>
    </div>
  )
}

export default DayPage
