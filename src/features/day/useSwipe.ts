import { useRef, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'

export const SWIPE_PX = 50

export type SwipeDir = 'left' | 'right'

export interface SwipeStart {
  id: number
  x: number
  y: number
}

export interface SwipeOptions {
  ignoreInteractive?: boolean
}

interface PointerLike {
  target: EventTarget | null
  pointerId: number
  pointerType: string
  clientX: number
  clientY: number
}

const BLOCKED = 'input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="dialog"]'
// a mouse drag on a button still fires click on release, so only touch/pen may swipe from buttons
const CLICKABLE = 'button, a, [role="button"]'

export function swipeBegin(e: PointerLike, opts: SwipeOptions = {}): SwipeStart | null {
  const el = e.target instanceof Element ? e.target : null
  if (typeof document !== 'undefined' && document.body.classList.contains('sheet-open')) return null
  if (el?.closest(BLOCKED)) return null
  if ((opts.ignoreInteractive ?? true) && e.pointerType === 'mouse' && el?.closest(CLICKABLE)) return null
  return { id: e.pointerId, x: e.clientX, y: e.clientY }
}

export function swipeEnd(start: SwipeStart | null, e: PointerLike): SwipeDir | null {
  if (!start || start.id !== e.pointerId) return null
  const dx = e.clientX - start.x
  const dy = e.clientY - start.y
  if (Math.abs(dx) < SWIPE_PX || Math.abs(dy) > Math.abs(dx)) return null
  return dx < 0 ? 'left' : 'right'
}

export interface SwipeHandlers {
  style: CSSProperties
  onPointerDown: (e: ReactPointerEvent) => void
  onPointerUp: (e: ReactPointerEvent) => void
  onPointerCancel: () => void
}

const SWIPE_STYLE: CSSProperties = { touchAction: 'pan-y' }

export function useSwipe(onLeft: () => void, onRight: () => void, opts: SwipeOptions = {}): SwipeHandlers {
  const start = useRef<SwipeStart | null>(null)
  return {
    style: SWIPE_STYLE,
    onPointerDown(e) {
      const s = swipeBegin(e, opts)
      if (!s) return
      start.current = s
      // the innermost swipe surface owns the gesture; outer surfaces must not react to the same pointer
      e.stopPropagation()
    },
    onPointerUp(e) {
      const dir = swipeEnd(start.current, e)
      start.current = null
      if (dir === 'left') onLeft()
      else if (dir === 'right') onRight()
    },
    onPointerCancel() {
      start.current = null
    },
  }
}
