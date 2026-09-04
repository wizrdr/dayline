import { formatDuration, formatRange } from '@/domain/dates'
import type { CalendarEvent, DayItem } from '@/domain/types'
import { DayRow, EventRow, GapLabel } from './DayRow'

const GAP_MIN = 60

interface DayListProps {
  label: string
  items: DayItem[]
  events: CalendarEvent[]
  heroKey: string | null
  onOpen: (item: DayItem) => void
  onToggleDone: (item: DayItem) => void
}

type Entry =
  | { kind: 'task'; start: number; end: number; item: DayItem }
  | { kind: 'event'; start: number; end: number; event: CalendarEvent }

export function DayList({ label, items, events, heroKey, onOpen, onToggleDone }: DayListProps) {
  const allDay = events.filter((e) => e.all_day)
  const entries: Entry[] = [
    ...items.flatMap<Entry>((item) =>
      item.start_min === null || item.key === heroKey
        ? []
        : [{ kind: 'task', start: item.start_min, end: item.start_min + item.duration_min, item }],
    ),
    ...events.flatMap<Entry>((event) =>
      event.all_day ? [] : [{ kind: 'event', start: event.start_min, end: event.start_min + event.duration_min, event }],
    ),
  ].sort((a, b) => a.start - b.start)

  if (entries.length === 0 && allDay.length === 0) return null

  return (
    <section>
      <h2 className="pb-2 text-xs font-semibold uppercase tracking-wider text-faint">{label}</h2>
      <ul data-testid="day-list" className="flex flex-col">
        {allDay.map((e) => (
          <EventRow key={e.id} title={e.title} sub="Весь день" />
        ))}
        {entries.map((entry, i) => {
          const prev = entries[i - 1]
          const gap = prev ? entry.start - prev.end : 0
          const row =
            entry.kind === 'task' ? (
              <DayRow
                key={entry.item.key}
                item={entry.item}
                sub={formatRange(entry.start, entry.item.duration_min)}
                onOpen={onOpen}
                onToggleDone={onToggleDone}
              />
            ) : (
              <EventRow key={`ev:${entry.event.id}`} title={entry.event.title} sub={formatRange(entry.start, entry.event.duration_min)} />
            )
          if (gap < GAP_MIN) return row
          return [<GapLabel key={`gap:${entry.start}`} text={`${formatDuration(gap)} свободно`} />, row]
        })}
      </ul>
    </section>
  )
}
