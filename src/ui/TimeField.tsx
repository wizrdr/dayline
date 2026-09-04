import { forwardRef } from 'react'
import { Input } from './Input'
import { hhmmToMinutes, minutesToHHMM } from './time'

export interface TimeFieldProps {
  value: number | null
  onChange: (min: number | null) => void
  placeholder?: string
  id?: string
  disabled?: boolean
  className?: string
}

export const TimeField = forwardRef<HTMLInputElement, TimeFieldProps>(function TimeField(
  { value, onChange, placeholder, id, disabled, className },
  ref,
) {
  return (
    <Input
      ref={ref}
      id={id}
      type="time"
      step={300}
      disabled={disabled}
      placeholder={placeholder}
      value={value === null ? '' : minutesToHHMM(value)}
      onChange={(e) => onChange(e.target.value === '' ? null : hhmmToMinutes(e.target.value))}
      className={className}
    />
  )
})

export default TimeField
