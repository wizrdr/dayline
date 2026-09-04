import { COMMIT_FRACTION, COMMIT_VELOCITY, IDLE, LOCK_PX, begin, canStart, damp, move, resolve, type Gesture } from './pagerGesture'

const WIDTH = 400

function drag(points: Array<[number, number, number]>): Gesture {
  let g = begin(100, 100)
  for (const [dx, dy, t] of points) g = move(g, 100 + dx, 100 + dy, t)
  return g
}

describe('pager gesture lock', () => {
  it('stays pending below the lock threshold', () => {
    expect(drag([[LOCK_PX - 1, 0, 10]]).phase).toBe('pending')
    expect(drag([[0, LOCK_PX - 1, 10]]).phase).toBe('pending')
  })

  it('locks horizontal when dx clearly dominates dy', () => {
    expect(drag([[LOCK_PX, 0, 10]]).phase).toBe('horizontal')
    expect(drag([[-13, 10, 10]]).phase).toBe('horizontal')
  })

  it('locks vertical on vertical or ambiguous diagonal moves', () => {
    expect(drag([[0, LOCK_PX, 10]]).phase).toBe('vertical')
    expect(drag([[12, 10, 10]]).phase).toBe('vertical')
    expect(drag([[10, 10, 10]]).phase).toBe('vertical')
  })

  it('never re-locks once a direction is chosen', () => {
    expect(drag([[0, 20, 10], [200, 20, 20]]).phase).toBe('vertical')
    const g = drag([[20, 0, 10], [20, 300, 20]])
    expect(g.phase).toBe('horizontal')
    expect(g.phase === 'horizontal' && g.dx).toBe(20)
  })

  it('ignores moves when idle', () => {
    expect(move(IDLE, 500, 500, 10)).toBe(IDLE)
  })
})

describe('pager gesture resolve', () => {
  it('returns null for gestures that never went horizontal', () => {
    expect(resolve(IDLE, WIDTH)).toBeNull()
    expect(resolve(begin(0, 0), WIDTH)).toBeNull()
    expect(resolve(drag([[0, 50, 10]]), WIDTH)).toBeNull()
  })

  it('commits by distance past a quarter of the width', () => {
    const far = WIDTH * COMMIT_FRACTION + 1
    expect(resolve(drag([[-far, 0, 1000]]), WIDTH)).toBe('next')
    expect(resolve(drag([[far, 0, 1000]]), WIDTH)).toBe('prev')
    expect(resolve(drag([[-(far - 2), 0, 1000]]), WIDTH)).toBe('snap')
  })

  it('commits a short but fast flick in the same direction', () => {
    const fast = drag([[-20, 0, 10], [-40, 0, 30]])
    expect(fast.phase === 'horizontal' && fast.vx).toBeLessThan(-COMMIT_VELOCITY)
    expect(resolve(fast, WIDTH)).toBe('next')
    const slow = drag([[-20, 0, 10], [-40, 0, 1000]])
    expect(resolve(slow, WIDTH)).toBe('snap')
  })

  it('does not commit when the finger flicks back against the displacement', () => {
    const back = drag([[-60, 0, 10], [-30, 0, 20]])
    expect(back.phase === 'horizontal' && back.vx).toBeGreaterThan(COMMIT_VELOCITY)
    expect(resolve(back, WIDTH)).toBe('snap')
  })

  it('keeps the previous velocity when two samples share a timestamp', () => {
    const g = drag([[-20, 0, 10], [-40, 0, 30], [-41, 0, 30]])
    expect(g.phase === 'horizontal' && g.vx).toBe(-1)
  })
})

describe('damp', () => {
  it('passes through inside the width and damps the overdrag', () => {
    expect(damp(120, WIDTH)).toBe(120)
    expect(damp(-WIDTH, WIDTH)).toBe(-WIDTH)
    expect(damp(WIDTH + 100, WIDTH)).toBe(WIDTH + 20)
    expect(damp(-(WIDTH + 100), WIDTH)).toBe(-(WIDTH + 20))
  })
})

describe('canStart', () => {
  afterEach(() => {
    document.body.replaceChildren()
    document.body.classList.remove('sheet-open')
  })

  it('refuses inputs, dialogs and an open sheet', () => {
    const input = document.createElement('input')
    const dialog = document.createElement('div')
    dialog.setAttribute('role', 'dialog')
    const inner = document.createElement('span')
    dialog.append(inner)
    const button = document.createElement('button')
    document.body.append(input, dialog, button)

    expect(canStart(input)).toBe(false)
    expect(canStart(inner)).toBe(false)
    expect(canStart(button)).toBe(true)
    expect(canStart(null)).toBe(true)

    document.body.classList.add('sheet-open')
    expect(canStart(button)).toBe(false)
  })
})
