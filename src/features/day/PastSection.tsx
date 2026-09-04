import { useState } from 'react'
import type { DayItem } from '@/domain/types'
import { EntryRow } from './DayList'
import { entryKey, pastSummary, type Entry } from './dayEntries'
import { plural } from './plural'

interface PastSectionProps {
  entries: Entry[]
  onOpen: (item: DayItem) => void
  onToggleDone: (item: DayItem) => void
}

export function PastSection({ entries, onOpen, onToggleDone }: PastSectionProps) {
  const [expanded, setExpanded] = useState(false)
  if (entries.length === 0) return null
  const { count, done } = pastSummary(entries)

  return (
    <section data-testid="past-section">
      <h2 className="pb-2 text-xs font-semibold uppercase tracking-wider text-faint">Раньше сегодня</h2>
      {expanded ? (
        <ul data-testid="past-list" className="flex flex-col">
          {entries.map((entry) => (
            <EntryRow key={entryKey(entry)} entry={entry} onOpen={onOpen} onToggleDone={onToggleDone} />
          ))}
        </ul>
      ) : (
        <button
          type="button"
          aria-expanded={false}
          onClick={() => setExpanded(true)}
          className="flex min-h-12 w-full items-center justify-between rounded-md bg-surface-raised px-4 text-left text-sm text-muted"
        >
          <span>
            {plural(count, 'дело', 'дела', 'дел')} раньше · {done} выполнено
          </span>
          <span aria-hidden className="text-lg leading-none text-faint">
            ›
          </span>
        </button>
      )}
    </section>
  )
}
