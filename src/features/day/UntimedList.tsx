import type { DayItem } from '@/domain/types'
import { DayRow } from './DayRow'

interface UntimedListProps {
  items: DayItem[]
  onOpen: (item: DayItem) => void
  onToggleDone: (item: DayItem) => void
}

export function UntimedList({ items, onOpen, onToggleDone }: UntimedListProps) {
  if (items.length === 0) return null
  return (
    <section>
      <h2 className="pb-2 text-xs font-semibold uppercase tracking-wider text-faint">Без времени</h2>
      <ul data-testid="untimed-list" className="flex flex-col">
        {items.map((item) => (
          <DayRow key={item.key} item={item} onOpen={onOpen} onToggleDone={onToggleDone} />
        ))}
      </ul>
    </section>
  )
}
