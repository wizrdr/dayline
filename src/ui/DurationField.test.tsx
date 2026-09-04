import { fireEvent, render, screen } from '@testing-library/react'
import { DurationField } from './DurationField'

function type(value: string, key = 'Enter') {
  const input = screen.getByLabelText('Длительность в минутах')
  fireEvent.change(input, { target: { value } })
  fireEvent.keyDown(input, { key })
  return input as HTMLInputElement
}

describe('DurationField', () => {
  it.each([
    ['2000', 1440],
    ['1', 5],
    ['47', 45],
    ['48', 50],
    ['90', 90],
  ])('commits %s as %i (clamped to 5..1440, snapped to 5)', (raw, expected) => {
    const onChange = vi.fn()
    render(<DurationField value={60} onChange={onChange} />)
    const input = type(raw)
    expect(onChange).toHaveBeenCalledWith(expected)
    expect(input.value).toBe(String(expected))
  })

  it('reverts garbage to the current value without calling onChange', () => {
    const onChange = vi.fn()
    render(<DurationField value={60} onChange={onChange} />)
    const input = type('abc')
    expect(onChange).not.toHaveBeenCalled()
    expect(input.value).toBe('60')
  })
})
