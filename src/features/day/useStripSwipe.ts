import { useRef, type TouchEvent as ReactTouchEvent } from 'react'
import { IDLE, begin, canStart, move, resolve, type Gesture } from './pagerGesture'

export interface StripSwipeHandlers {
  onTouchStart: (e: ReactTouchEvent<HTMLElement>) => void
  onTouchMove: (e: ReactTouchEvent<HTMLElement>) => void
  onTouchEnd: (e: ReactTouchEvent<HTMLElement>) => void
  onTouchCancel: () => void
}

export function useStripSwipe(onSwipe: (dir: -1 | 1) => void): StripSwipeHandlers {
  const gesture = useRef<Gesture>(IDLE)
  return {
    onTouchStart(e) {
      e.stopPropagation()
      if (e.touches.length !== 1 || !canStart(e.target)) return
      const t = e.changedTouches[0]
      gesture.current = begin(t.clientX, t.clientY)
    },
    onTouchMove(e) {
      const t = e.changedTouches[0]
      gesture.current = move(gesture.current, t.clientX, t.clientY, e.timeStamp)
    },
    onTouchEnd(e) {
      const outcome = resolve(gesture.current, e.currentTarget.clientWidth)
      gesture.current = IDLE
      if (outcome === 'next') onSwipe(1)
      else if (outcome === 'prev') onSwipe(-1)
    },
    onTouchCancel() {
      gesture.current = IDLE
    },
  }
}
