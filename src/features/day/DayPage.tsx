import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useCalendarEvents, useOverrides, useTasks } from '@/db/hooks'
import { formatDayTitle, fromISODate, snapMin, todayISO } from '@/domain/dates'
import { materializeDay } from '@/domain/recurrence'
import type { DayItem, ISODate, Task } from '@/domain/types'
import { useSession } from '@/features/auth/session'
import { TaskSheet } from '@/features/task-sheet/TaskSheet'
import { Button } from '@/ui'
import { extendItem, moveItem, toggleDone } from './actions'
import { DateStrip } from './DateStrip'
import { DayList } from './DayList'
import { HeroCard } from './HeroCard'
import { heroItem, heroState } from './heroState'
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
  const nowMin = useNowMinutes()

  const tasks = useTasks()
  const overrides = useOverrides()
  const events = useCalendarEvents(date)
  const items = useMemo(() => materializeDay(tasks, overrides, date), [tasks, overrides, date])
  const untimed = items.filter((i) => i.start_min === null)
  const isToday = date === today
  const hero = heroState(items, isToday, nowMin)
  const heroKey = heroItem(hero)?.key ?? null

  const open = (task: Task | null, item: DayItem | null) => {
    setSheet({ task, item })
    setSheetOpen(true)
  }
  const onToggleDone = (item: DayItem) => {
    if (userId) void toggleDone(item, overrides, userId)
  }
  const onExtend = (item: DayItem) => {
    if (userId) void extendItem(item, 15, overrides, userId)
  }
  const onStartNow = (item: DayItem) => {
    if (userId) void moveItem(item, snapMin(nowMin), overrides, userId)
  }

  return (
    <div className="relative h-full overflow-y-auto bg-bg">
      <div className="mx-auto flex max-w-[480px] flex-col gap-4 px-5 pb-[calc(env(safe-area-inset-bottom)+144px)]">
        <div>
          <header className="flex items-end justify-between pb-2 pt-4">
            <div className="flex flex-col gap-0.5">
              <h1 className="text-[28px] font-bold leading-none tracking-tight text-text">{formatDayTitle(date, today)}</h1>
              <span className="text-sm text-muted">{format(fromISODate(date), 'EEEE, d MMMM', { locale: ru })}</span>
            </div>
            {!isToday && (
              <Button variant="ghost" size="sm" onClick={() => setDate(today)}>
                Сегодня
              </Button>
            )}
          </header>
          <DateStrip date={date} onChange={setDate} />
        </div>
        <HeroCard state={hero} onDone={onToggleDone} onExtend={onExtend} onStartNow={onStartNow} />
        <DayList
          label={!isToday ? 'Расписание' : heroKey ? 'Дальше сегодня' : 'Сегодня'}
          items={items}
          events={events}
          heroKey={heroKey}
          onOpen={(item) => open(item.task, item)}
          onToggleDone={onToggleDone}
        />
        <UntimedList items={untimed} onOpen={(item) => open(item.task, item)} onToggleDone={onToggleDone} />
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

export default DayPage
