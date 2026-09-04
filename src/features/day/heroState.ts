import { nowAndNext } from '@/domain/recurrence'
import type { DayItem } from '@/domain/types'

export type HeroState =
  | { kind: 'current'; item: DayItem; remaining: number; progress: number }
  | { kind: 'next'; item: DayItem; inMin: number }
  | { kind: 'done'; done: number; total: number }
  | { kind: 'empty' }
  | { kind: 'summary'; count: number; totalMin: number }

export function heroState(items: DayItem[], isToday: boolean, nowMin: number): HeroState {
  if (!isToday) {
    return { kind: 'summary', count: items.length, totalMin: items.reduce((s, i) => s + i.duration_min, 0) }
  }
  const { current, next } = nowAndNext(items, nowMin)
  if (current?.start_min != null) {
    const elapsed = nowMin - current.start_min
    return {
      kind: 'current',
      item: current,
      remaining: current.duration_min - elapsed,
      progress: Math.min(1, elapsed / current.duration_min),
    }
  }
  if (next?.start_min != null) return { kind: 'next', item: next, inMin: next.start_min - nowMin }
  if (items.length === 0) return { kind: 'empty' }
  return { kind: 'done', done: items.filter((i) => i.done).length, total: items.length }
}

export function heroItem(state: HeroState): DayItem | null {
  return state.kind === 'current' || state.kind === 'next' ? state.item : null
}
