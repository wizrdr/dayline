import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useCalendarEvents, useOverrides, useTasksState } from '@/db/hooks'
import { addDaysISO, formatDayTitle, fromISODate, snapMin, todayISO } from '@/domain/dates'
import { materializeDay } from '@/domain/recurrence'
import type { DayItem, ISODate, Task } from '@/domain/types'
import { useSession } from '@/features/auth/session'
import { TaskSheet } from '@/features/task-sheet/TaskSheet'
import { Button, cn } from '@/ui'
import { extendItem, moveItem, toggleDone } from './actions'
import { DateStrip } from './DateStrip'
import { DayList } from './DayList'
import { buildEntries, splitEntries } from './dayEntries'
import { HeroCard } from './HeroCard'
import { heroItem, heroState } from './heroState'
import { PastSection } from './PastSection'
import { UntimedList } from './UntimedList'
import { useNowMinutes } from './useNowMinutes'
import { useSwipe } from './useSwipe'

interface SheetTarget {
  task: Task | null
  item: DayItem | null
}

interface DayCursor {
  date: ISODate
  dir: 1 | -1
}

export function DayPage() {
  const today = todayISO()
  const [cursor, setCursor] = useState<DayCursor>({ date: today, dir: 1 })
  const { date } = cursor
  const [sheet, setSheet] = useState<SheetTarget>({ task: null, item: null })
  const [sheetOpen, setSheetOpen] = useState(false)
  const userId = useSession().user?.id ?? null
  const nowMin = useNowMinutes()

  const { tasks, loaded } = useTasksState()
  const overrides = useOverrides()
  const events = useCalendarEvents(date)
  const items = useMemo(() => materializeDay(tasks, overrides, date), [tasks, overrides, date])
  const untimed = items.filter((i) => i.start_min === null)
  const allDay = events.filter((e) => e.all_day)
  const isToday = date === today
  const hero = heroState(items, isToday, nowMin)
  const heroKey = heroItem(hero)?.key ?? null
  const { past, future } = splitEntries(buildEntries(items, events, heroKey), isToday ? nowMin : null)
  const entered = useEntered(date)

  const setDate = (next: ISODate) => setCursor((c) => (next === c.date ? c : { date: next, dir: next > c.date ? 1 : -1 }))
  const swipe = useSwipe(
    () => setDate(addDaysISO(date, 1)),
    () => setDate(addDaysISO(date, -1)),
  )

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
    <div data-testid="day-root" className="relative h-full overflow-y-auto bg-bg" {...swipe}>
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
        {!loaded ? (
          <DaySkeleton />
        ) : (
          <div
            key={date}
            className={cn(
              'flex flex-col gap-4 transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none',
              entered ? 'translate-x-0 opacity-100' : cn('opacity-0', cursor.dir === 1 ? 'translate-x-3' : '-translate-x-3'),
            )}
          >
            <PastSection entries={past} onOpen={(item) => open(item.task, item)} onToggleDone={onToggleDone} />
            <HeroCard
              state={hero}
              onOpen={(item) => open(item.task, item)}
              onDone={onToggleDone}
              onExtend={onExtend}
              onStartNow={onStartNow}
            />
            <DayList
              label={isToday ? 'Дальше сегодня' : 'Расписание'}
              entries={future}
              allDay={allDay}
              onOpen={(item) => open(item.task, item)}
              onToggleDone={onToggleDone}
            />
            <UntimedList items={untimed} onOpen={(item) => open(item.task, item)} onToggleDone={onToggleDone} />
          </div>
        )}
      </div>
      <button
        type="button"
        aria-label="Новая задача"
        onClick={() => open(null, null)}
        className="fixed right-[max(1rem,calc(50%-224px))] z-30 flex size-14 items-center justify-center rounded-full bg-accent text-accent-fg shadow-card transition-transform duration-fast active:scale-95"
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

// false for one frame after `key` changes so the CSS transition has a start state to animate from
function useEntered(key: string): boolean {
  const [enteredKey, setEnteredKey] = useState<string | null>(null)
  useEffect(() => {
    const raf = requestAnimationFrame(() => setEnteredKey(key))
    return () => cancelAnimationFrame(raf)
  }, [key])
  return enteredKey === key
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
