import { act, render, screen } from '@testing-library/react'
import { useEffect, useState } from 'react'
import type { ISODate } from '@/domain/types'
import { DayPager } from './DayPager'
import { REST, usePager, type Pager } from './usePager'

const WIDTH = 400

function Harness({ onChange, expose }: { onChange: (d: ISODate) => void; expose?: (api: Pager) => void }) {
  const [date, setDate] = useState<ISODate>('2026-09-04')
  const pager = usePager({
    date,
    onChange: (d) => {
      setDate(d)
      onChange(d)
    },
  })
  useEffect(() => {
    expose?.(pager)
  }, [expose, pager])
  return (
    <>
      <h1>{date}</h1>
      <DayPager date={date} pager={pager} renderDay={(d) => <span>{d}</span>} />
    </>
  )
}

type Point = { x: number; y: number; t?: number; cancelable?: boolean }

function touch(el: Element, type: string, { x, y, t = 0, cancelable = true }: Point): Event {
  const e = new Event(type, { bubbles: true, cancelable })
  const list = [{ clientX: x, clientY: y, identifier: 1 }]
  Object.defineProperties(e, {
    touches: { value: type === 'touchend' || type === 'touchcancel' ? [] : list },
    changedTouches: { value: list },
    timeStamp: { value: t },
  })
  el.dispatchEvent(e)
  return e
}

function transitionEnd(el: Element) {
  el.dispatchEvent(Object.assign(new Event('transitionend', { bubbles: true }), { propertyName: 'transform' }))
}

function track(): HTMLElement {
  const el = screen.getByTestId('day-track')
  Object.defineProperty(el, 'clientWidth', { value: WIDTH, configurable: true })
  return el
}

describe('usePager', () => {
  it('follows the finger once locked horizontal and prevents the native scroll', () => {
    render(<Harness onChange={vi.fn()} />)
    const el = track()
    touch(el, 'touchstart', { x: 200, y: 300 })
    const first = touch(el, 'touchmove', { x: 180, y: 302, t: 10 })
    expect(first.defaultPrevented).toBe(true)
    touch(el, 'touchmove', { x: 80, y: 305, t: 50 })
    expect(el.style.transform).toBe('translateX(calc(-100% + -120px))')
    expect(el.style.transition).toBe('none')
  })

  it('commits to the next day after a long drag and resets the track without a transition', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    const el = track()
    touch(el, 'touchstart', { x: 300, y: 300 })
    touch(el, 'touchmove', { x: 280, y: 300, t: 10 })
    touch(el, 'touchmove', { x: 150, y: 300, t: 500 })
    touch(el, 'touchend', { x: 150, y: 300, t: 510 })
    expect(el.style.transform).toBe('translateX(-200%)')
    expect(el.style.transition).toContain('var(--dur-normal)')
    expect(onChange).not.toHaveBeenCalled()

    act(() => transitionEnd(el))
    expect(onChange).toHaveBeenCalledWith('2026-09-05')
    expect(screen.getByRole('heading')).toHaveTextContent('2026-09-05')
    expect(el.style.transform).toBe(REST)
    expect(el.style.transition).toBe('none')
    expect(screen.getByTestId('day-panel')).toHaveTextContent('2026-09-05')
  })

  it('snaps back after a short drag and ignores a vertical gesture', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    const el = track()
    touch(el, 'touchstart', { x: 300, y: 300 })
    touch(el, 'touchmove', { x: 280, y: 300, t: 10 })
    touch(el, 'touchmove', { x: 270, y: 300, t: 500 })
    touch(el, 'touchend', { x: 270, y: 300, t: 510 })
    expect(el.style.transform).toBe(REST)
    act(() => transitionEnd(el))
    expect(onChange).not.toHaveBeenCalled()

    touch(el, 'touchstart', { x: 300, y: 300 })
    const vertical = touch(el, 'touchmove', { x: 302, y: 320, t: 10 })
    expect(vertical.defaultPrevented).toBe(false)
    touch(el, 'touchmove', { x: 100, y: 400, t: 50 })
    touch(el, 'touchend', { x: 100, y: 400, t: 60 })
    expect(el.style.transform).toBe(REST)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('treats a non-cancelable first move as a native scroll and snaps back on touchcancel', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    const el = track()
    touch(el, 'touchstart', { x: 300, y: 300 })
    touch(el, 'touchmove', { x: 100, y: 300, t: 10, cancelable: false })
    touch(el, 'touchend', { x: 100, y: 300, t: 20 })
    expect(onChange).not.toHaveBeenCalled()

    touch(el, 'touchstart', { x: 300, y: 300 })
    touch(el, 'touchmove', { x: 100, y: 300, t: 10 })
    touch(el, 'touchcancel', { x: 100, y: 300, t: 20 })
    expect(el.style.transform).toBe(REST)
    act(() => transitionEnd(el))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('goNext/goPrev slide programmatically and queue a call made mid-flight', () => {
    const onChange = vi.fn()
    let api: Pager | null = null
    render(<Harness onChange={onChange} expose={(p) => (api = p)} />)
    const el = track()
    act(() => api!.goPrev())
    expect(el.style.transform).toBe('translateX(0%)')
    act(() => api!.goNext())
    expect(el.style.transform).toBe('translateX(0%)')
    act(() => transitionEnd(el))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('2026-09-03')
    // the tap made during the slide runs right after it settles instead of being dropped
    expect(el.style.transform).toBe('translateX(-200%)')
    act(() => transitionEnd(el))
    expect(onChange).toHaveBeenCalledTimes(2)
    expect(el.style.transform).toBe(REST)
  })

  it('switches instantly when the user prefers reduced motion', () => {
    const original = window.matchMedia
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia
    const onChange = vi.fn()
    let api: Pager | null = null
    render(<Harness onChange={onChange} expose={(p) => (api = p)} />)
    const el = track()
    act(() => api!.goNext())
    expect(onChange).toHaveBeenCalledWith('2026-09-05')
    expect(el.style.transform).toBe(REST)
    window.matchMedia = original
  })
})
