import { useEffect, useMemo, useRef } from 'react'
import { minutesNow, todayISO } from '@/domain/dates'
import { DAY_END_MIN, HOURS, heightPx, hourLabel, layoutColumns, topPx } from '@/domain/layout'
import type { CalendarEvent, DayItem, ISODate } from '@/domain/types'
import { AllDayChips, EventBlock } from './EventBlock'
import { NowLine } from './NowLine'
import { TaskBlock } from './TaskBlock'
import { useNowMinutes } from './useNowMinutes'

export interface TimelineProps {
  date: ISODate
  items: DayItem[]
  events: CalendarEvent[]
  onOpen: (item: DayItem) => void
  onToggleDone: (item: DayItem) => void
  onMove: (item: DayItem, startMin: number) => void
}

const GUTTER_PX = 48
const DEFAULT_SCROLL_MIN = 8 * 60

interface Scheduled {
  item: DayItem
  start: number
}

export function Timeline({ date, items, events, onOpen, onToggleDone, onMove }: TimelineProps) {
  const isToday = date === todayISO()
  const nowMin = useNowMinutes()
  const scrollRef = useRef<HTMLDivElement>(null)

  const scheduled = useMemo<Scheduled[]>(
    () => items.flatMap((item) => (item.start_min === null ? [] : [{ item, start: item.start_min }])),
    [items],
  )
  const timed = useMemo(() => events.filter((e) => !e.all_day), [events])
  const allDay = useMemo(() => events.filter((e) => e.all_day), [events])

  const slots = useMemo(
    () =>
      layoutColumns([
        ...scheduled.map(({ item, start }) => ({ key: item.key, start_min: start, duration_min: item.duration_min })),
        ...timed.map((e) => ({ key: `ev:${e.id}`, start_min: e.start_min, duration_min: e.duration_min })),
      ]),
    [scheduled, timed],
  )

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const target = isToday ? topPx(minutesNow()) - el.clientHeight / 3 : topPx(DEFAULT_SCROLL_MIN)
    el.scrollTop = Math.max(0, target)
  }, [date, isToday])

  return (
    <div ref={scrollRef} data-testid="timeline" className="h-full overflow-x-hidden overflow-y-auto">
      <AllDayChips events={allDay} />
      <div className="relative" style={{ height: `${heightPx(DAY_END_MIN)}px` }}>
        {HOURS.map((h) => (
          <div key={h} className="absolute inset-x-0" style={{ top: `${topPx(h * 60)}px` }}>
            <span className="absolute -top-2 left-0 w-10 text-right text-xs text-faint">{hourLabel(h)}</span>
            <span className="absolute right-0 h-px bg-grid-line" style={{ left: `${GUTTER_PX}px` }} />
          </div>
        ))}
        <div className="absolute inset-y-0 right-4" style={{ left: `${GUTTER_PX}px` }}>
          {timed.map((e) => (
            <EventBlock key={e.id} event={e} slot={slots.get(`ev:${e.id}`) ?? { col: 0, cols: 1 }} />
          ))}
          {scheduled.map(({ item, start }) => (
            <TaskBlock
              key={item.key}
              item={item}
              start={start}
              slot={slots.get(item.key) ?? { col: 0, cols: 1 }}
              onOpen={onOpen}
              onToggleDone={onToggleDone}
              onMove={onMove}
            />
          ))}
        </div>
        {isToday && <NowLine nowMin={nowMin} gutterPx={GUTTER_PX} />}
      </div>
    </div>
  )
}
