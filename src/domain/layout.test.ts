import { describe, expect, it } from 'vitest'
import { HOURS, heightPx, hourLabel, layoutColumns, minFromPx, topPx } from './layout'

const block = (key: string, start_min: number, duration_min: number) => ({
  key,
  start_min,
  duration_min,
})

describe('layoutColumns', () => {
  it('no overlap → each in col 0 of 1', () => {
    const map = layoutColumns([block('a', 0, 60), block('b', 120, 60)])
    expect(map.get('a')).toEqual({ col: 0, cols: 1 })
    expect(map.get('b')).toEqual({ col: 0, cols: 1 })
  })

  it('two overlapping → col 0 and 1, cols 2', () => {
    const map = layoutColumns([block('a', 0, 60), block('b', 30, 60)])
    expect(map.get('a')).toEqual({ col: 0, cols: 2 })
    expect(map.get('b')).toEqual({ col: 1, cols: 2 })
  })

  it('chained overlap forms one cluster; C reuses col 0', () => {
    const map = layoutColumns([block('a', 0, 60), block('b', 30, 60), block('c', 60, 60)])
    expect(map.get('a')).toEqual({ col: 0, cols: 2 })
    expect(map.get('b')).toEqual({ col: 1, cols: 2 })
    expect(map.get('c')).toEqual({ col: 0, cols: 2 })
  })

  it('three mutually overlapping → cols 3', () => {
    const map = layoutColumns([block('a', 0, 90), block('b', 30, 90), block('c', 60, 90)])
    expect(map.get('a')?.col).toBe(0)
    expect(map.get('b')?.col).toBe(1)
    expect(map.get('c')?.col).toBe(2)
    for (const k of ['a', 'b', 'c']) expect(map.get(k)?.cols).toBe(3)
  })

  it('touching blocks are separate clusters', () => {
    const map = layoutColumns([block('a', 0, 60), block('b', 60, 60), block('c', 70, 10)])
    expect(map.get('a')).toEqual({ col: 0, cols: 1 })
    expect(map.get('b')).toEqual({ col: 0, cols: 2 })
    expect(map.get('c')).toEqual({ col: 1, cols: 2 })
  })

  it('longer block first at the same start', () => {
    const map = layoutColumns([block('short', 0, 30), block('long', 0, 120)])
    expect(map.get('long')?.col).toBe(0)
    expect(map.get('short')?.col).toBe(1)
  })
})

describe('geometry', () => {
  it('converts minutes to px and back', () => {
    expect(topPx(60)).toBe(72)
    expect(heightPx(60)).toBe(72)
    expect(heightPx(5)).toBe(24)
    expect(minFromPx(72)).toBe(60)
    expect(minFromPx(75)).toBe(65)
  })

  it('hours and labels', () => {
    expect(HOURS).toHaveLength(24)
    expect(HOURS[0]).toBe(0)
    expect(HOURS[23]).toBe(23)
    expect(hourLabel(9)).toBe('09:00')
  })
})
