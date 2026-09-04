import type { CSSProperties } from 'react'
import { heightPx, topPx, type ColumnSlot } from '@/domain/layout'

const GAP_PX = 2

export function slotStyle(start: number, duration: number, slot: ColumnSlot): CSSProperties {
  return {
    top: `${topPx(start)}px`,
    height: `${heightPx(duration)}px`,
    left: `${(slot.col / slot.cols) * 100}%`,
    width: `calc(${100 / slot.cols}% - ${GAP_PX}px)`,
  }
}
