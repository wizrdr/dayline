import { formatMin, formatRange } from '@/domain/dates'
import { heightPx, type ColumnSlot } from '@/domain/layout'
import type { DayItem } from '@/domain/types'
import { cn, taskBgClass, taskSoftBgClass } from '@/ui'
import { DoneButton } from './DoneButton'
import { slotStyle } from './slotStyle'
import { useDragMove } from './useDragMove'

interface TaskBlockProps {
  item: DayItem
  start: number
  slot: ColumnSlot
  onOpen: (item: DayItem) => void
  onToggleDone: (item: DayItem) => void
  onMove: (item: DayItem, startMin: number) => void
}

export function TaskBlock({ item, start, slot, onOpen, onToggleDone, onMove }: TaskBlockProps) {
  const drag = useDragMove(start, (min) => onMove(item, min))
  const shownStart = drag.previewMin ?? start
  const height = heightPx(item.duration_min)
  const compact = item.duration_min < 30
  const color = item.task.color

  return (
    <div
      role="button"
      tabIndex={0}
      data-testid="task-block"
      aria-label={item.task.title}
      onClick={() => {
        if (!drag.consumeDrag()) onOpen(item)
      }}
      onKeyDown={(e) => e.key === 'Enter' && onOpen(item)}
      {...drag.handlers}
      style={{ ...slotStyle(shownStart, item.duration_min, slot), touchAction: 'pan-y', WebkitTouchCallout: 'none' }}
      className={cn(
        'absolute flex select-none overflow-hidden rounded-md pl-2.5 pr-1.5 text-left shadow-card',
        'transition-[box-shadow,opacity] duration-fast',
        taskSoftBgClass[color],
        compact ? 'items-center py-0' : 'items-start py-1.5',
        drag.dragging && 'z-20 opacity-90 shadow-sheet',
      )}
    >
      <span aria-hidden className={cn('absolute inset-y-0 left-0 w-[3px]', taskBgClass[color])} />
      <div className={cn('min-w-0 flex-1', compact && 'flex items-center')}>
        <div className={cn('truncate text-sm font-medium', item.done ? 'line-through text-muted' : 'text-text')}>
          {item.task.title}
        </div>
        {height >= 40 && !compact && (
          <div className="text-xs text-faint">{formatRange(shownStart, item.duration_min)}</div>
        )}
        {compact && drag.dragging && <span className="ml-2 text-xs text-faint">{formatMin(shownStart)}</span>}
      </div>
      <DoneButton done={item.done} color={color} onToggle={() => onToggleDone(item)} className="ml-1.5" />
    </div>
  )
}
