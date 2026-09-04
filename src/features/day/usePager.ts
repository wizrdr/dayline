import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { addDaysISO } from '@/domain/dates'
import type { ISODate } from '@/domain/types'
import { IDLE, begin, canStart, damp, move, resolve, type Gesture } from './pagerGesture'

export const REST = 'translateX(-100%)'
const SLIDE = 'transform var(--dur-normal) var(--ease)'
const CLICK_SUPPRESS_MS = 350
const SETTLE_FALLBACK_MS = 400

export interface Pager {
  setTrack: (el: HTMLDivElement | null) => void
  goPrev: () => void
  goNext: () => void
}

interface PagerOptions {
  date: ISODate
  onChange: (date: ISODate) => void
}

function reducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function usePager({ date, onChange }: PagerOptions): Pager {
  const [track, setTrack] = useState<HTMLDivElement | null>(null)
  const go = useRef<(dir: -1 | 1) => void>(() => {})
  const [api] = useState<Pager>(() => ({ setTrack, goPrev: () => go.current(-1), goNext: () => go.current(1) }))
  const latest = useRef({ date, onChange })
  const gesture = useRef<Gesture>(IDLE)
  const settle = useRef<(() => void) | null>(null)
  const settleAt = useRef(0)
  const queued = useRef<-1 | 1 | null>(null)
  const suppressClick = useRef(false)
  useEffect(() => {
    latest.current = { date, onChange }
  })

  useEffect(() => {
    if (!track) return
    const ctrl = new AbortController()
    const { signal } = ctrl

    const commit = (dir: -1 | 1) => {
      flushSync(() => latest.current.onChange(addDaysISO(latest.current.date, dir)))
      track.style.transition = 'none'
      track.style.transform = REST
    }

    const slideTo = (transform: string, after: (() => void) | null) => {
      if (settle.current) return
      // transitionend never fires when the value does not change and can be lost while the tab is hidden
      const timer = window.setTimeout(() => settle.current?.(), SETTLE_FALLBACK_MS)
      settleAt.current = performance.now()
      settle.current = () => {
        window.clearTimeout(timer)
        settle.current = null
        after?.()
        track.style.transition = 'none'
        const next = queued.current
        queued.current = null
        if (next) go.current(next)
      }
      track.style.transition = SLIDE
      track.style.transform = transform
    }

    go.current = (dir) => {
      if (settle.current) {
        queued.current = dir
        return
      }
      if (reducedMotion()) return commit(dir)
      slideTo(dir === 1 ? 'translateX(-200%)' : 'translateX(0%)', () => commit(dir))
    }

    const finish = () => {
      const outcome = resolve(gesture.current, track.clientWidth)
      suppressClick.current = gesture.current.phase === 'horizontal'
      // a touch swipe emits no click at all, so the flag must not swallow the next unrelated tap
      if (suppressClick.current) window.setTimeout(() => (suppressClick.current = false), CLICK_SUPPRESS_MS)
      gesture.current = IDLE
      if (outcome === null) return
      if (outcome === 'snap') return slideTo(REST, null)
      go.current(outcome === 'next' ? 1 : -1)
    }

    let touchId: number | null = null
    const touchById = (e: TouchEvent) => Array.from(e.changedTouches).find((t) => t.identifier === touchId) ?? null
    // touch events keep flowing even after Safari starts a native pan, unlike pointer events which get cancelled;
    // and we never bail on a non-cancelable move: inside an overflow scroller Safari marks them all non-cancelable
    track.addEventListener(
      'touchstart',
      (e) => {
        if (touchId !== null || e.touches.length !== 1) return
        if (settle.current && performance.now() - settleAt.current > SETTLE_FALLBACK_MS) settle.current()
        if (settle.current || !canStart(e.target)) return
        const t = e.changedTouches[0]
        touchId = t.identifier
        suppressClick.current = false
        gesture.current = begin(t.clientX, t.clientY)
      },
      { passive: true, signal },
    )
    track.addEventListener(
      'touchmove',
      (e) => {
        const t = touchById(e)
        if (!t) return
        const g = gesture.current
        if (g.phase === 'idle' || g.phase === 'vertical') return
        const next = move(g, t.clientX, t.clientY, e.timeStamp)
        gesture.current = next
        if (next.phase !== 'horizontal') return
        if (e.cancelable) e.preventDefault()
        track.style.transition = 'none'
        track.style.transform = `translateX(calc(-100% + ${damp(next.dx, track.clientWidth)}px))`
      },
      { passive: false, signal },
    )
    const end = (e: TouchEvent) => {
      if (!touchById(e)) return
      touchId = null
      finish()
    }
    track.addEventListener('touchend', end, { signal })
    track.addEventListener(
      'touchcancel',
      (e) => {
        if (!touchById(e)) return
        touchId = null
        const wasHorizontal = gesture.current.phase === 'horizontal'
        gesture.current = IDLE
        if (wasHorizontal) slideTo(REST, null)
      },
      { signal },
    )
    // a horizontal drag must not end as a click on the row underneath
    track.addEventListener(
      'click',
      (e) => {
        if (suppressClick.current) {
          suppressClick.current = false
          e.stopPropagation()
          e.preventDefault()
        }
      },
      { capture: true, signal },
    )
    track.addEventListener(
      'transitionend',
      (e) => {
        if (e.target === track && e.propertyName === 'transform') settle.current?.()
      },
      { signal },
    )
    return () => {
      ctrl.abort()
      settle.current = null
      gesture.current = IDLE
      go.current = () => {}
    }
  }, [track])

  return api
}
