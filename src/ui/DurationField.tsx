import { useEffect, useState } from 'react'
import { cn } from './cn'
import { Input } from './Input'
import { formatDuration } from './time'

export interface DurationFieldProps {
  value: number
  onChange: (min: number) => void
  presets?: number[]
  className?: string
}

const DEFAULT_PRESETS = [15, 30, 45, 60, 90, 120]

export function DurationField({ value, onChange, presets = DEFAULT_PRESETS, className }: DurationFieldProps) {
  const [draft, setDraft] = useState(String(value))
  useEffect(() => setDraft(String(value)), [value])

  const commit = () => {
    const n = Math.round(Number(draft))
    if (Number.isFinite(n) && n > 0) onChange(n)
    else setDraft(String(value))
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div role="radiogroup" aria-label="Длительность" className="flex flex-wrap gap-1.5">
        {presets.map((p) => {
          const active = p === value
          return (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(p)}
              className={cn(
                'min-h-9 px-3 rounded-full text-sm font-medium select-none whitespace-nowrap',
                'transition-colors duration-fast ease-out',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                active ? 'bg-accent text-accent-fg' : 'bg-surface-raised text-muted hover:text-text',
              )}
            >
              {formatDuration(p)}
            </button>
          )
        })}
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          inputMode="numeric"
          min={1}
          max={1440}
          aria-label="Длительность в минутах"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
          }}
          className="w-24 text-center"
        />
        <span className="text-sm text-muted">мин</span>
      </div>
    </div>
  )
}

export default DurationField
