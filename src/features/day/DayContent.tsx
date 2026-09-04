import { useMemo } from 'react'
import { useCalendarEvents } from '@/db/hooks'
import { materializeDay } from '@/domain/recurrence'
import type { DayItem, ISODate, Task, TaskOverride } from '@/domain/types'
import { DayList } from './DayList'
import { buildEntries, splitEntries } from './dayEntries'
import { HeroCard } from './HeroCard'
import { heroItem, heroState } from './heroState'
import { PastSection } from './PastSection'
import { UntimedList } from './UntimedList'

export interface DayActions {
  onOpen: (item: DayItem) => void
  onToggleDone: (item: DayItem) => void
  onExtend: (item: DayItem) => void
  onStartNow: (item: DayItem) => void
}

interface DayContentProps extends DayActions {
  date: ISODate
  today: ISODate
  nowMin: number
  tasks: Task[]
  overrides: TaskOverride[]
}

export function DayContent({ date, today, nowMin, tasks, overrides, onOpen, onToggleDone, onExtend, onStartNow }: DayContentProps) {
  const events = useCalendarEvents(date)
  const items = useMemo(() => materializeDay(tasks, overrides, date), [tasks, overrides, date])
  const untimed = items.filter((i) => i.start_min === null)
  const allDay = events.filter((e) => e.all_day)
  const isToday = date === today
  const hero = heroState(items, isToday, nowMin)
  const heroKey = heroItem(hero)?.key ?? null
  const { past, future } = splitEntries(buildEntries(items, events, heroKey), isToday ? nowMin : null)

  return (
    <>
      <PastSection entries={past} onOpen={onOpen} onToggleDone={onToggleDone} />
      <HeroCard state={hero} onOpen={onOpen} onDone={onToggleDone} onExtend={onExtend} onStartNow={onStartNow} />
      <DayList
        label={isToday ? 'Дальше сегодня' : 'Расписание'}
        entries={future}
        allDay={allDay}
        onOpen={onOpen}
        onToggleDone={onToggleDone}
      />
      <UntimedList items={untimed} onOpen={onOpen} onToggleDone={onToggleDone} />
    </>
  )
}
