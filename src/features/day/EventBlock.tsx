import { formatRange } from '@/domain/dates'
import { heightPx, type ColumnSlot } from '@/domain/layout'
import type { CalendarEvent } from '@/domain/types'
import { cn } from '@/ui'
import { slotStyle } from './slotStyle'

interface EventBlockProps {
  event: CalendarEvent
  slot: ColumnSlot
}

export function EventBlock({ event, slot }: EventBlockProps) {
  const compact = event.duration_min < 30
  return (
    <div
      data-testid="event-block"
      aria-hidden
      style={slotStyle(event.start_min, event.duration_min, slot)}
      className={cn(
        'pointer-events-none absolute overflow-hidden rounded-md border border-dashed border-border-strong',
        'bg-surface-raised px-2 text-muted',
        compact ? 'flex items-center py-0' : 'py-1.5',
      )}
    >
      <div className="truncate text-sm">{event.title}</div>
      {!compact && heightPx(event.duration_min) >= 40 && (
        <div className="text-xs text-faint">{formatRange(event.start_min, event.duration_min)}</div>
      )}
    </div>
  )
}

export function AllDayChips({ events }: { events: CalendarEvent[] }) {
  if (events.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5 px-3 pb-2 pt-1">
      {events.map((e) => (
        <span
          key={e.id}
          className="rounded-full border border-dashed border-border-strong bg-surface-raised px-2.5 py-0.5 text-xs text-muted"
        >
          {e.title}
        </span>
      ))}
    </div>
  )
}
