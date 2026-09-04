import { IDLE, dragReducer, dragResult, type DragEvent, type DragState } from './useDragMove'

const down = (touch: boolean, startMin = 540): DragEvent => ({
  type: 'down',
  pointerId: 1,
  touch,
  x: 100,
  y: 200,
  startMin,
})
const move = (dx: number, dy: number, pointerId = 1): DragEvent => ({
  type: 'move',
  pointerId,
  x: 100 + dx,
  y: 200 + dy,
})

function run(events: DragEvent[], from: DragState = IDLE): DragState {
  return events.reduce(dragReducer, from)
}

describe('dragReducer (mouse)', () => {
  it('stays pending below the 4px threshold', () => {
    const s = run([down(false), move(2, 2)])
    expect(s.phase).toBe('pending')
  })

  it('starts dragging after 4px and snaps the target to 5 minutes', () => {
    const s = run([down(false), move(0, 6)])
    expect(s.phase).toBe('dragging')
    expect(dragResult(s)).toBe(545)
  })

  it('clamps to the day bounds', () => {
    const s = run([down(false, 10), move(0, -500)])
    expect(dragResult(s)).toBe(0)
  })

  it('reports no move when released at the original slot', () => {
    const s = run([down(false), move(0, 6), move(0, 0)])
    expect(s.phase).toBe('dragging')
    expect(dragResult(s)).toBeNull()
  })

  it('ignores moves from another pointer', () => {
    const s = run([down(false), move(0, 50, 2)])
    expect(s.phase).toBe('pending')
  })

  it('returns to idle on up and cancel', () => {
    expect(run([down(false), move(0, 20), { type: 'up' }])).toBe(IDLE)
    expect(run([down(false), move(0, 20), { type: 'cancel' }])).toBe(IDLE)
  })
})

describe('dragReducer (touch)', () => {
  it('does not start dragging from movement alone', () => {
    const s = run([down(true), move(0, 30)])
    expect(s.phase).toBe('idle')
  })

  it('tolerates a small jitter while waiting for the long press', () => {
    const s = run([down(true), move(3, 3)])
    expect(s.phase).toBe('pending')
  })

  it('starts dragging on long press and then follows the finger', () => {
    const s = run([down(true), { type: 'longpress' }, move(0, 36)])
    expect(s.phase).toBe('dragging')
    expect(dragResult(s)).toBe(570)
  })

  it('ignores long press for mouse pointers', () => {
    expect(run([down(false), { type: 'longpress' }]).phase).toBe('pending')
  })
})
