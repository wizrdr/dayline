import { fireEvent, render, screen } from '@testing-library/react'
import { hhmmToMinutes, minutesToHHMM } from './time'
import { TimeField } from './TimeField'

describe('time helpers', () => {
  it('converts minutes to HH:MM', () => {
    expect(minutesToHHMM(0)).toBe('00:00')
    expect(minutesToHHMM(570)).toBe('09:30')
    expect(minutesToHHMM(1439)).toBe('23:59')
  })

  it('converts HH:MM to minutes', () => {
    expect(hhmmToMinutes('09:30')).toBe(570)
    expect(hhmmToMinutes('00:00')).toBe(0)
    expect(hhmmToMinutes('23:59:00')).toBe(1439)
    expect(hhmmToMinutes('')).toBeNull()
    expect(hhmmToMinutes('25:00')).toBeNull()
    expect(hhmmToMinutes('abc')).toBeNull()
  })
})

describe('TimeField', () => {
  it('renders minutes as HH:MM and empty for null', () => {
    const { rerender } = render(<TimeField value={570} onChange={() => {}} />)
    const input = screen.getByDisplayValue('09:30')
    expect(input).toHaveAttribute('type', 'time')
    rerender(<TimeField value={null} onChange={() => {}} />)
    expect(input).toHaveValue('')
  })

  it('emits minutes on change', () => {
    const onChange = vi.fn()
    render(<TimeField value={null} onChange={onChange} />)
    fireEvent.change(screen.getByDisplayValue(''), { target: { value: '14:05' } })
    expect(onChange).toHaveBeenLastCalledWith(845)
  })

  it('emits null when cleared', () => {
    const onChange = vi.fn()
    render(<TimeField value={570} onChange={onChange} />)
    fireEvent.change(screen.getByDisplayValue('09:30'), { target: { value: '' } })
    expect(onChange).toHaveBeenLastCalledWith(null)
  })
})
