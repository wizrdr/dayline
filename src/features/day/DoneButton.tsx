import type { MouseEvent } from 'react'
import type { TaskColor } from '@/domain/types'
import { cn, taskBgClass, taskBorderClass } from '@/ui'

interface DoneButtonProps {
  done: boolean
  color: TaskColor
  onToggle: () => void
  className?: string
}

export function DoneButton({ done, color, onToggle, className }: DoneButtonProps) {
  const onClick = (e: MouseEvent) => {
    e.stopPropagation()
    onToggle()
  }
  return (
    <button
      type="button"
      aria-label="Выполнено"
      aria-pressed={done}
      onClick={onClick}
      className={cn('flex size-11 shrink-0 items-center justify-center', className)}
    >
      <span
        className={cn(
          'flex size-6 items-center justify-center rounded-full border-2 transition-colors duration-fast',
          taskBorderClass[color],
          done ? cn(taskBgClass[color], 'text-accent-fg') : 'bg-transparent text-transparent',
        )}
      >
        <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden>
          <path d="M3 8.5l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </button>
  )
}
