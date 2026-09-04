import type { DayItem } from '@/domain/types'
import { ColorDot, cn } from '@/ui'
import { DoneButton } from './DoneButton'

interface UntimedListProps {
  items: DayItem[]
  onOpen: (item: DayItem) => void
  onToggleDone: (item: DayItem) => void
}

export function UntimedList({ items, onOpen, onToggleDone }: UntimedListProps) {
  if (items.length === 0) return null
  return (
    <section className="px-4 pb-2">
      <h2 className="pb-1 text-xs font-medium uppercase tracking-wide text-faint">Без времени</h2>
      <ul className="flex flex-col divide-y divide-border rounded-md bg-surface shadow-card">
        {items.map((item) => (
          <li key={item.key} className="flex min-h-11 items-center gap-3 pl-3">
            <DoneButton done={item.done} color={item.task.color} onToggle={() => onToggleDone(item)} />
            <button
              type="button"
              onClick={() => onOpen(item)}
              className="flex min-h-11 min-w-0 flex-1 items-center gap-2 pr-3 text-left"
            >
              <ColorDot color={item.task.color} size="sm" />
              <span className={cn('min-w-0 flex-1 truncate text-sm', item.done ? 'line-through text-muted' : 'text-text')}>
                {item.task.title}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
