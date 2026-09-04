import type { ReactNode } from 'react'
import type { DayItem } from '@/domain/types'
import { TaskIcon, cn, taskSoftBgClass, taskTextClass } from '@/ui'
import { DoneButton } from './DoneButton'

interface DayRowProps {
  item: DayItem
  sub?: string
  onOpen: (item: DayItem) => void
  onToggleDone: (item: DayItem) => void
}

export function DayRow({ item, sub, onOpen, onToggleDone }: DayRowProps) {
  const color = item.task.color
  return (
    <li className="flex items-center gap-3 border-b border-border" data-testid="day-row">
      <button type="button" onClick={() => onOpen(item)} className="flex min-h-14 min-w-0 flex-1 items-center gap-3 py-2.5 text-left">
        <Tile className={cn(taskSoftBgClass[color], taskTextClass[color])}>
          <TaskIcon name={item.task.icon} size={18} />
        </Tile>
        <RowText title={item.task.title} sub={sub} note={item.task.note} className={item.done ? 'line-through opacity-55' : 'text-text'} />
      </button>
      <DoneButton done={item.done} color={color} onToggle={() => onToggleDone(item)} className="-mr-2.5" />
    </li>
  )
}

export function EventRow({ title, sub }: { title: string; sub: string }) {
  return (
    <li className="flex min-h-14 items-center gap-3 border-b border-border py-2.5" data-testid="event-row">
      <Tile className="border-[1.5px] border-dashed border-border-strong text-faint">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
      </Tile>
      <RowText title={title} sub={sub} className="text-muted" />
    </li>
  )
}

export function GapLabel({ text }: { text: string }) {
  return (
    <li className="py-2 text-xs font-semibold uppercase tracking-wider text-faint" data-testid="gap-label">
      {text}
    </li>
  )
}

function Tile({ className, children }: { className: string; children: ReactNode }) {
  return <div className={cn('flex size-[34px] shrink-0 items-center justify-center rounded-md', className)}>{children}</div>
}

// one compact sub line «time · note», truncated together so every row keeps the same height
function RowText({ title, sub, note, className }: { title: string; sub?: string; note?: string; className: string }) {
  const hasNote = Boolean(note?.trim())
  return (
    <div className="min-w-0 flex-1">
      <div className={cn('truncate text-[15px] font-semibold leading-snug', className)}>{title}</div>
      {(sub || hasNote) && (
        <div className="truncate text-xs text-faint">
          {sub && <span>{sub}</span>}
          {sub && hasNote && <span aria-hidden> · </span>}
          {hasNote && <span data-testid="row-note">{note}</span>}
        </div>
      )}
    </div>
  )
}
