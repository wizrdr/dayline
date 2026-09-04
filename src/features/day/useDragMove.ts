import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { clampMin, snapMin } from '@/domain/dates'
import { PX_PER_MIN } from '@/domain/layout'

export const MOUSE_THRESHOLD_PX = 4
export const TOUCH_SLOP_PX = 10
export const LONG_PRESS_MS = 350

export type DragState =
  | { phase: 'idle' }
  | { phase: 'pending'; pointerId: number; touch: boolean; x: number; y: number; startMin: number }
  | { phase: 'dragging'; pointerId: number; y: number; startMin: number; currentMin: number }

export type DragEvent =
  | { type: 'down'; pointerId: number; touch: boolean; x: number; y: number; startMin: number }
  | { type: 'move'; pointerId: number; x: number; y: number }
  | { type: 'longpress' }
  | { type: 'up' }
  | { type: 'cancel' }

export const IDLE: DragState = { phase: 'idle' }

export function dragReducer(state: DragState, ev: DragEvent): DragState {
  switch (ev.type) {
    case 'down':
      return state.phase === 'idle' ? pending(ev) : state
    case 'longpress':
      return state.phase === 'pending' && state.touch ? startDrag(state) : state
    case 'move':
      return onMove(state, ev)
    case 'up':
    case 'cancel':
      return IDLE
  }
}

function pending(ev: Extract<DragEvent, { type: 'down' }>): DragState {
  return { phase: 'pending', pointerId: ev.pointerId, touch: ev.touch, x: ev.x, y: ev.y, startMin: ev.startMin }
}

function startDrag(s: Extract<DragState, { phase: 'pending' }>): DragState {
  return { phase: 'dragging', pointerId: s.pointerId, y: s.y, startMin: s.startMin, currentMin: s.startMin }
}

function onMove(state: DragState, ev: Extract<DragEvent, { type: 'move' }>): DragState {
  if (state.phase === 'idle' || state.pointerId !== ev.pointerId) return state
  if (state.phase === 'pending') {
    const dist = Math.hypot(ev.x - state.x, ev.y - state.y)
    if (state.touch) return dist > TOUCH_SLOP_PX ? IDLE : state
    return dist >= MOUSE_THRESHOLD_PX ? onMove(startDrag(state), ev) : state
  }
  const currentMin = snapMin(clampMin(state.startMin + (ev.y - state.y) / PX_PER_MIN))
  return currentMin === state.currentMin ? state : { ...state, currentMin }
}

export function dragResult(state: DragState): number | null {
  return state.phase === 'dragging' && state.currentMin !== state.startMin ? state.currentMin : null
}

function preventTouchMove(e: TouchEvent) {
  e.preventDefault()
}

export function useDragMove(startMin: number, onMove: (min: number) => void) {
  const [state, setState] = useState<DragState>(IDLE)
  const stateRef = useRef(state)
  const timer = useRef<number | null>(null)
  const didDrag = useRef(false)

  const dispatch = useCallback((ev: DragEvent) => {
    const next = dragReducer(stateRef.current, ev)
    if (next === stateRef.current) return
    stateRef.current = next
    setState(next)
  }, [])

  const clearTimer = () => {
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = null
  }

  const dragging = state.phase === 'dragging'
  useEffect(() => {
    if (!dragging) return
    document.addEventListener('touchmove', preventTouchMove, { passive: false })
    return () => document.removeEventListener('touchmove', preventTouchMove)
  }, [dragging])

  const onPointerDown = (e: ReactPointerEvent<HTMLElement>) => {
    if (e.button !== 0) return
    const touch = e.pointerType === 'touch' || e.pointerType === 'pen'
    dispatch({ type: 'down', pointerId: e.pointerId, touch, x: e.clientX, y: e.clientY, startMin })
    clearTimer()
    if (touch) {
      const el = e.currentTarget
      timer.current = window.setTimeout(() => {
        dispatch({ type: 'longpress' })
        if (stateRef.current.phase === 'dragging') el.setPointerCapture(e.pointerId)
      }, LONG_PRESS_MS)
    }
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLElement>) => {
    const before = stateRef.current.phase
    dispatch({ type: 'move', pointerId: e.pointerId, x: e.clientX, y: e.clientY })
    const after = stateRef.current.phase
    if (after !== 'pending') clearTimer()
    if (before !== 'dragging' && after === 'dragging') e.currentTarget.setPointerCapture(e.pointerId)
  }

  const finish = (commit: boolean) => {
    clearTimer()
    const result = dragResult(stateRef.current)
    didDrag.current = stateRef.current.phase === 'dragging'
    dispatch({ type: 'up' })
    if (commit && result !== null) onMove(result)
  }

  const consumeDrag = () => {
    const was = didDrag.current
    didDrag.current = false
    return was
  }

  const previewMin = state.phase === 'dragging' ? state.currentMin : null
  return {
    dragging,
    previewMin,
    consumeDrag,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: () => finish(true),
      onPointerCancel: () => finish(false),
    },
  }
}
