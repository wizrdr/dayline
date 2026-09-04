import type { IconName, TaskColor } from '@/domain/types'
import { cn } from './cn'
import { taskRingClass, taskSoftBgClass, taskTextClass } from './ColorPicker'
import { ICON_NAMES, TaskIcon } from './TaskIcon'

export interface IconPickerProps {
  value: IconName | null
  onChange: (n: IconName) => void
  color: TaskColor
  className?: string
}

export function IconPicker({ value, onChange, color, className }: IconPickerProps) {
  return (
    <div role="group" aria-label="Иконка" className={cn('flex flex-wrap gap-2', className)}>
      {ICON_NAMES.map((name) => {
        const selected = name === value
        return (
          <button
            key={name}
            type="button"
            aria-label={name}
            aria-pressed={selected}
            onClick={() => onChange(name)}
            className={cn(
              'flex size-11 items-center justify-center rounded-full transition-[background-color,color,box-shadow] duration-fast ease-out',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
              selected
                ? cn('ring-2 ring-offset-2 ring-offset-surface', taskSoftBgClass[color], taskTextClass[color], taskRingClass[color])
                : 'bg-surface-raised text-muted',
            )}
          >
            <TaskIcon name={name} size={22} />
          </button>
        )
      })}
    </div>
  )
}

export default IconPicker
