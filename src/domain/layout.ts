import { formatMin, snapMin } from './dates'

export const PX_PER_MIN = 1.2
export const DAY_START_MIN = 0
export const DAY_END_MIN = 1440
export const MIN_BLOCK_PX = 24

export const HOURS: number[] = Array.from({ length: 24 }, (_, h) => h)

export function topPx(startMin: number): number {
  return (startMin - DAY_START_MIN) * PX_PER_MIN
}

export function heightPx(durationMin: number): number {
  return Math.max(MIN_BLOCK_PX, durationMin * PX_PER_MIN)
}

export function minFromPx(px: number): number {
  return snapMin(px / PX_PER_MIN + DAY_START_MIN)
}

export function hourLabel(h: number): string {
  return formatMin(h * 60)
}

interface Block {
  key: string
  start_min: number
  duration_min: number
}

export interface ColumnSlot {
  col: number
  cols: number
}

export function layoutColumns<T extends Block>(blocks: T[]): Map<string, ColumnSlot> {
  const sorted = [...blocks].sort(
    (a, b) => a.start_min - b.start_min || b.duration_min - a.duration_min,
  )
  const result = new Map<string, ColumnSlot>()
  let cluster: T[] = []
  let clusterEnd = -Infinity
  for (const block of sorted) {
    if (block.start_min >= clusterEnd && cluster.length > 0) {
      placeCluster(cluster, result)
      cluster = []
    }
    cluster.push(block)
    clusterEnd = Math.max(clusterEnd, block.start_min + block.duration_min)
  }
  if (cluster.length > 0) placeCluster(cluster, result)
  return result
}

function placeCluster<T extends Block>(cluster: T[], out: Map<string, ColumnSlot>): void {
  const columnEnds: number[] = []
  const slots: { key: string; col: number }[] = []
  for (const block of cluster) {
    let col = columnEnds.findIndex((end) => end <= block.start_min)
    if (col === -1) col = columnEnds.length
    columnEnds[col] = block.start_min + block.duration_min
    slots.push({ key: block.key, col })
  }
  for (const { key, col } of slots) out.set(key, { col, cols: columnEnds.length })
}
