import type { TaskColor } from '@/domain/types'
import { cn } from './cn'

export const TASK_COLORS: readonly TaskColor[] = [1, 2, 3, 4, 5, 6, 7, 8]

export const taskBgClass: Record<TaskColor, string> = {
  1: 'bg-task-1',
  2: 'bg-task-2',
  3: 'bg-task-3',
  4: 'bg-task-4',
  5: 'bg-task-5',
  6: 'bg-task-6',
  7: 'bg-task-7',
  8: 'bg-task-8',
}

export const taskSoftBgClass: Record<TaskColor, string> = {
  1: 'bg-task-1-soft',
  2: 'bg-task-2-soft',
  3: 'bg-task-3-soft',
  4: 'bg-task-4-soft',
  5: 'bg-task-5-soft',
  6: 'bg-task-6-soft',
  7: 'bg-task-7-soft',
  8: 'bg-task-8-soft',
}

export const taskTextClass: Record<TaskColor, string> = {
  1: 'text-task-1',
  2: 'text-task-2',
  3: 'text-task-3',
  4: 'text-task-4',
  5: 'text-task-5',
  6: 'text-task-6',
  7: 'text-task-7',
  8: 'text-task-8',
}

export const taskBorderClass: Record<TaskColor, string> = {
  1: 'border-task-1',
  2: 'border-task-2',
  3: 'border-task-3',
  4: 'border-task-4',
  5: 'border-task-5',
  6: 'border-task-6',
  7: 'border-task-7',
  8: 'border-task-8',
}

export const taskRingClass: Record<TaskColor, string> = {
  1: 'ring-task-1',
  2: 'ring-task-2',
  3: 'ring-task-3',
  4: 'ring-task-4',
  5: 'ring-task-5',
  6: 'ring-task-6',
  7: 'ring-task-7',
  8: 'ring-task-8',
}

export interface ColorDotProps {
  color: TaskColor
  size?: 'sm' | 'md'
  className?: string
}

export function ColorDot({ color, size = 'md', className }: ColorDotProps) {
  return (
    <span
      aria-hidden
      className={cn('inline-block rounded-full shrink-0', taskBgClass[color], size === 'sm' ? 'size-2.5' : 'size-4', className)}
    />
  )
}

export interface ColorPickerProps {
  value: TaskColor
  onChange: (c: TaskColor) => void
  className?: string
}

export function ColorPicker({ value, onChange, className }: ColorPickerProps) {
  return (
    <div role="radiogroup" aria-label="Цвет" className={cn('flex flex-wrap gap-2', className)}>
      {TASK_COLORS.map((c) => {
        const selected = c === value
        return (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`Цвет ${c}`}
            onClick={() => onChange(c)}
            className={cn(
              'size-11 rounded-full flex items-center justify-center',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
            )}
          >
            <span
              aria-hidden
              className={cn(
                'block size-7 rounded-full transition-[box-shadow,transform] duration-fast ease-out',
                taskBgClass[c],
                selected && cn('ring-2 ring-offset-2 ring-offset-surface scale-110', taskRingClass[c]),
              )}
            />
          </button>
        )
      })}
    </div>
  )
}

export default ColorPicker
