import { formatDuration, formatRange } from '@/domain/dates'
import type { CalendarEvent, DayItem } from '@/domain/types'
import { DayRow, EventRow, GapLabel } from './DayRow'
import { entryKey, type Entry } from './dayEntries'

const GAP_MIN = 60

interface DayListProps {
  label: string
  entries: Entry[]
  allDay?: CalendarEvent[]
  onOpen: (item: DayItem) => void
  onToggleDone: (item: DayItem) => void
}

export function DayList({ label, entries, allDay = [], onOpen, onToggleDone }: DayListProps) {
  // the hero item stays in the timeline so gaps are measured against it, but its row is not rendered
  if (entries.every((e) => e.hero) && allDay.length === 0) return null

  return (
    <section>
      <h2 className="pb-2 text-xs font-semibold uppercase tracking-wider text-faint">{label}</h2>
      <ul data-testid="day-list" className="flex flex-col">
        {allDay.map((e) => (
          <EventRow key={e.id} title={e.title} sub="Весь день" />
        ))}
        {entries.map((entry, i) => {
          if (entry.hero) return null
          const prev = entries[i - 1]
          const gap = prev ? entry.start - prev.end : 0
          const row = <EntryRow key={entryKey(entry)} entry={entry} onOpen={onOpen} onToggleDone={onToggleDone} />
          if (gap < GAP_MIN) return row
          return [<GapLabel key={`gap:${entry.start}`} text={`${formatDuration(gap)} свободно`} />, row]
        })}
      </ul>
    </section>
  )
}

export function EntryRow({
  entry,
  onOpen,
  onToggleDone,
}: {
  entry: Entry
  onOpen: (item: DayItem) => void
  onToggleDone: (item: DayItem) => void
}) {
  if (entry.kind === 'task') {
    return <DayRow item={entry.item} sub={formatRange(entry.start, entry.item.duration_min)} onOpen={onOpen} onToggleDone={onToggleDone} />
  }
  return <EventRow title={entry.event.title} sub={formatRange(entry.start, entry.event.duration_min)} />
}
