export const LOCK_PX = 3
export const LOCK_RATIO = 1
export const COMMIT_FRACTION = 0.18
export const COMMIT_VELOCITY = 0.25
export const FLICK_MIN_PX = 20
const VELOCITY_WINDOW_MS = 100
const OVERDRAG_DAMP = 0.2

export type Gesture =
  | { phase: 'idle' }
  | { phase: 'pending'; x0: number; y0: number }
  | { phase: 'horizontal'; x0: number; dx: number; x: number; t: number; vx: number; trail: { x: number; t: number }[] }
  | { phase: 'vertical' }

export type Outcome = 'prev' | 'next' | 'snap' | null

export const IDLE: Gesture = { phase: 'idle' }

const BLOCKED = 'input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="dialog"]'

export function canStart(target: EventTarget | null): boolean {
  if (document.body.classList.contains('sheet-open')) return false
  return !(target instanceof Element && target.closest(BLOCKED))
}

export function begin(x: number, y: number): Gesture {
  return { phase: 'pending', x0: x, y0: y }
}

export function move(g: Gesture, x: number, y: number, t: number): Gesture {
  if (g.phase === 'pending') {
    const dx = x - g.x0
    const dy = y - g.y0
    if (Math.max(Math.abs(dx), Math.abs(dy)) < LOCK_PX) return g
    if (Math.abs(dx) >= Math.abs(dy) * LOCK_RATIO) return { phase: 'horizontal', x0: g.x0, dx, x, t, vx: 0, trail: [{ x, t }] }
    return { phase: 'vertical' }
  }
  if (g.phase === 'horizontal') {
    // velocity over the last ~100ms: iOS coalesces pointer moves, so two adjacent samples under-read a flick
    const trail = [...g.trail, { x, t }].filter((p) => t - p.t <= VELOCITY_WINDOW_MS)
    const first = trail[0] ?? { x, t }
    const dt = t - first.t
    return { ...g, dx: x - g.x0, x, t, vx: dt > 0 ? (x - first.x) / dt : g.vx, trail }
  }
  return g
}

export function resolve(g: Gesture, width: number): Outcome {
  if (g.phase !== 'horizontal') return null
  const far = Math.abs(g.dx) > width * COMMIT_FRACTION
  const fast = Math.abs(g.dx) >= FLICK_MIN_PX && Math.abs(g.vx) > COMMIT_VELOCITY && Math.sign(g.vx) === Math.sign(g.dx)
  if (!far && !fast) return 'snap'
  return g.dx > 0 ? 'prev' : 'next'
}

export function damp(dx: number, width: number): number {
  const over = Math.abs(dx) - width
  return over <= 0 ? dx : Math.sign(dx) * (width + over * OVERDRAG_DAMP)
}
