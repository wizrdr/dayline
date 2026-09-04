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
      <DayPager
        date={date}
        pager={pager}
        renderDay={(d) => (
          <span>
            {d}
            <button type="button">row</button>
          </span>
        )}
      />
    </>
  )
}

type PointerType = 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel'
type Point = { x: number; y: number; t?: number; pointerId?: number; pointerType?: string }

function pointer(el: Element, type: PointerType, { x, y, t, pointerId = 1, pointerType = 'touch' }: Point): Event {
  const init = { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, buttons: type === 'pointerup' || type === 'pointercancel' ? 0 : 1 }
  const e =
    typeof PointerEvent === 'undefined'
      ? Object.defineProperties(new MouseEvent(type, init), {
          pointerId: { value: pointerId },
          pointerType: { value: pointerType },
          isPrimary: { value: true },
          button: { value: 0 },
        })
      : new PointerEvent(type, { ...init, pointerId, pointerType, isPrimary: true })
  if (t !== undefined) Object.defineProperty(e, 'timeStamp', { value: t })
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

function drag(el: Element, from: number, to: number, t = 500) {
  pointer(el, 'pointerdown', { x: from, y: 300 })
  pointer(el, 'pointermove', { x: from + Math.sign(to - from) * 20, y: 300, t: 10 })
  pointer(el, 'pointermove', { x: to, y: 300, t })
  pointer(el, 'pointerup', { x: to, y: 300, t: t + 10 })
}

beforeAll(() => {
  // jsdom implements PointerEvent but not pointer capture
  const proto = HTMLElement.prototype as Partial<HTMLElement>
  proto.setPointerCapture ??= function () {}
  proto.releasePointerCapture ??= function () {}
  proto.hasPointerCapture ??= () => false
})

describe('usePager', () => {
  it('follows the finger once locked horizontal and captures the pointer', () => {
    render(<Harness onChange={vi.fn()} />)
    const el = track()
    const capture = vi.spyOn(el, 'setPointerCapture')
    pointer(el, 'pointerdown', { x: 200, y: 300 })
    expect(el.style.transform).toBe(REST)
    pointer(el, 'pointermove', { x: 180, y: 302, t: 10 })
    expect(capture).toHaveBeenCalledTimes(1)
    expect(capture).toHaveBeenCalledWith(1)
    expect(el.style.transform).toBe('translateX(calc(-100% + -20px))')
    pointer(el, 'pointermove', { x: 80, y: 305, t: 50 })
    expect(capture).toHaveBeenCalledTimes(1)
    expect(el.style.transform).toBe('translateX(calc(-100% + -120px))')
    expect(el.style.transition).toBe('none')
  })

  it('commits to the next day after a long drag and resets the track without a transition', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    const el = track()
    drag(el, 300, 150)
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
    drag(el, 300, 270)
    expect(el.style.transform).toBe(REST)
    expect(el.style.transition).toContain('var(--dur-normal)')
    act(() => transitionEnd(el))
    expect(onChange).not.toHaveBeenCalled()

    pointer(el, 'pointerdown', { x: 300, y: 300 })
    pointer(el, 'pointermove', { x: 302, y: 320, t: 10 })
    pointer(el, 'pointermove', { x: 100, y: 400, t: 50 })
    expect(el.style.transform).toBe(REST)
    expect(el.style.transition).toBe('none')
    pointer(el, 'pointerup', { x: 100, y: 400, t: 60 })
    expect(el.style.transform).toBe(REST)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('ignores moves from another pointer and snaps back when the browser cancels a horizontal drag', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    const el = track()
    pointer(el, 'pointerdown', { x: 300, y: 300 })
    pointer(el, 'pointermove', { x: 100, y: 300, t: 10, pointerId: 2 })
    expect(el.style.transform).toBe(REST)
    pointer(el, 'pointerup', { x: 100, y: 300, t: 20, pointerId: 2 })
    pointer(el, 'pointerup', { x: 300, y: 300, t: 30 })
    expect(onChange).not.toHaveBeenCalled()

    pointer(el, 'pointerdown', { x: 300, y: 300 })
    pointer(el, 'pointermove', { x: 100, y: 300, t: 10 })
    expect(el.style.transform).toBe('translateX(calc(-100% + -200px))')
    pointer(el, 'pointercancel', { x: 100, y: 300, t: 20 })
    expect(el.style.transform).toBe(REST)
    expect(el.style.transition).toContain('var(--dur-normal)')
    act(() => transitionEnd(el))
    expect(onChange).not.toHaveBeenCalled()

    // the pager is usable again right after the cancel
    drag(el, 300, 150)
    expect(el.style.transform).toBe('translateX(-200%)')
  })

  it('swallows the click that follows a horizontal drag, but not a plain tap', () => {
    render(<Harness onChange={vi.fn()} />)
    const el = track()
    const parentClick = vi.fn()
    el.parentElement!.addEventListener('click', parentClick)
    const button = screen.getByTestId('day-panel').querySelector('button')!

    drag(el, 300, 150)
    const suppressed = new MouseEvent('click', { bubbles: true, cancelable: true })
    button.dispatchEvent(suppressed)
    expect(suppressed.defaultPrevented).toBe(true)
    expect(parentClick).not.toHaveBeenCalled()

    const passed = new MouseEvent('click', { bubbles: true, cancelable: true })
    button.dispatchEvent(passed)
    expect(passed.defaultPrevented).toBe(false)
    expect(parentClick).toHaveBeenCalledTimes(1)

    pointer(el, 'pointerdown', { x: 300, y: 300 })
    pointer(el, 'pointerup', { x: 300, y: 300, t: 10 })
    const tap = new MouseEvent('click', { bubbles: true, cancelable: true })
    button.dispatchEvent(tap)
    expect(tap.defaultPrevented).toBe(false)
    expect(parentClick).toHaveBeenCalledTimes(2)
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
