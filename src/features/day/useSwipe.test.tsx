import { fireEvent, render, screen } from '@testing-library/react'
import { SWIPE_PX, swipeBegin, swipeEnd, useSwipe } from './useSwipe'

const ptr = (patch: Partial<PointerEvent> & { target?: EventTarget | null }) => ({
  target: null,
  pointerId: 1,
  pointerType: 'touch',
  clientX: 200,
  clientY: 300,
  ...patch,
})

describe('swipe state machine', () => {
  afterEach(() => document.body.classList.remove('sheet-open'))

  it('detects a left swipe past the threshold', () => {
    const start = swipeBegin(ptr({}))
    expect(swipeEnd(start, ptr({ clientX: 200 - SWIPE_PX }))).toBe('left')
    expect(swipeEnd(start, ptr({ clientX: 200 + SWIPE_PX }))).toBe('right')
  })

  it('ignores short moves and vertical-dominant gestures', () => {
    const start = swipeBegin(ptr({}))
    expect(swipeEnd(start, ptr({ clientX: 200 - SWIPE_PX + 1 }))).toBeNull()
    expect(swipeEnd(start, ptr({ clientX: 120, clientY: 400 }))).toBeNull()
    expect(swipeEnd(start, ptr({ clientX: 120, clientY: 379 }))).toBe('left')
  })

  it('ignores a pointer that did not start the gesture', () => {
    const start = swipeBegin(ptr({ pointerId: 1 }))
    expect(swipeEnd(start, ptr({ pointerId: 2, clientX: 0 }))).toBeNull()
    expect(swipeEnd(null, ptr({ clientX: 0 }))).toBeNull()
  })

  it('does not start on inputs, inside dialogs, or while a sheet is open', () => {
    const input = document.createElement('input')
    document.body.append(input)
    expect(swipeBegin(ptr({ target: input }))).toBeNull()

    const dialog = document.createElement('div')
    dialog.setAttribute('role', 'dialog')
    const inner = document.createElement('span')
    dialog.append(inner)
    document.body.append(dialog)
    expect(swipeBegin(ptr({ target: inner }))).toBeNull()

    document.body.classList.add('sheet-open')
    expect(swipeBegin(ptr({ target: document.body }))).toBeNull()
    input.remove()
    dialog.remove()
  })

  it('lets touch swipes start on buttons but not mouse drags, unless interactive targets are allowed', () => {
    const button = document.createElement('button')
    document.body.append(button)
    expect(swipeBegin(ptr({ target: button, pointerType: 'touch' }))).not.toBeNull()
    expect(swipeBegin(ptr({ target: button, pointerType: 'mouse' }))).toBeNull()
    expect(swipeBegin(ptr({ target: button, pointerType: 'mouse' }), { ignoreInteractive: false })).not.toBeNull()
    button.remove()
  })
})

describe('useSwipe', () => {
  function Surface({ onLeft, onRight }: { onLeft: () => void; onRight: () => void }) {
    const swipe = useSwipe(onLeft, onRight)
    return (
      <div data-testid="surface" {...swipe}>
        <button type="button">row</button>
      </div>
    )
  }

  it('applies touch-action pan-y and fires callbacks from synthetic pointer events', () => {
    const onLeft = vi.fn()
    const onRight = vi.fn()
    render(<Surface onLeft={onLeft} onRight={onRight} />)
    const surface = screen.getByTestId('surface')
    expect(surface).toHaveStyle({ touchAction: 'pan-y' })

    fireEvent.pointerDown(surface, { pointerId: 1, pointerType: 'touch', clientX: 300, clientY: 100 })
    fireEvent.pointerUp(surface, { pointerId: 1, pointerType: 'touch', clientX: 200, clientY: 110 })
    expect(onLeft).toHaveBeenCalledTimes(1)

    fireEvent.pointerDown(surface, { pointerId: 2, pointerType: 'touch', clientX: 100, clientY: 100 })
    fireEvent.pointerUp(surface, { pointerId: 2, pointerType: 'touch', clientX: 200, clientY: 100 })
    expect(onRight).toHaveBeenCalledTimes(1)
  })

  it('resets on pointercancel and does not fire when the gesture starts on a button with a mouse', () => {
    const onLeft = vi.fn()
    render(<Surface onLeft={onLeft} onRight={vi.fn()} />)
    const surface = screen.getByTestId('surface')

    fireEvent.pointerDown(surface, { pointerId: 1, pointerType: 'touch', clientX: 300, clientY: 100 })
    fireEvent.pointerCancel(surface, { pointerId: 1 })
    fireEvent.pointerUp(surface, { pointerId: 1, pointerType: 'touch', clientX: 100, clientY: 100 })
    expect(onLeft).not.toHaveBeenCalled()

    fireEvent.pointerDown(screen.getByRole('button'), { pointerId: 3, pointerType: 'mouse', clientX: 300, clientY: 100 })
    fireEvent.pointerUp(surface, { pointerId: 3, pointerType: 'mouse', clientX: 100, clientY: 100 })
    expect(onLeft).not.toHaveBeenCalled()
  })

  it('the inner surface owns the gesture: the outer one does not fire for the same pointer', () => {
    const outer = vi.fn()
    const inner = vi.fn()
    function Nested() {
      const outerSwipe = useSwipe(outer, outer)
      const innerSwipe = useSwipe(inner, inner)
      return (
        <div data-testid="outer" {...outerSwipe}>
          <div data-testid="inner" {...innerSwipe} />
        </div>
      )
    }
    render(<Nested />)
    const el = screen.getByTestId('inner')
    fireEvent.pointerDown(el, { pointerId: 1, pointerType: 'touch', clientX: 300, clientY: 100 })
    fireEvent.pointerUp(el, { pointerId: 1, pointerType: 'touch', clientX: 100, clientY: 100 })
    expect(inner).toHaveBeenCalledTimes(1)
    expect(outer).not.toHaveBeenCalled()
  })
})
