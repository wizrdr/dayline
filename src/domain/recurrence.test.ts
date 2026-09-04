import { describe, expect, it } from 'vitest'
import { mkOverride, mkTask } from './fixtures'
import {
  inboxItems,
  materializeDay,
  nowAndNext,
  occursOn,
  overrideFor,
  remindersDue,
} from './recurrence'

// 2026-09-07 is Monday
const MON = '2026-09-07'
const TUE = '2026-09-08'
const THU = '2026-09-10'
const FRI = '2026-09-11'
const SAT = '2026-09-12'

const monThu = mkTask({
  id: 'series-1',
  kind: 'series',
  weekdays: [1, 2, 3, 4],
  start_date: '2026-09-01',
  start_min: 18 * 60,
  duration_min: 60,
  title: 'Gym',
})

describe('occursOn', () => {
  it('series Mon–Thu appears Mon and Thu, not Fri/Sat', () => {
    expect(occursOn(monThu, MON)).toBe(true)
    expect(occursOn(monThu, THU)).toBe(true)
    expect(occursOn(monThu, FRI)).toBe(false)
    expect(occursOn(monThu, SAT)).toBe(false)
  })

  it('daily series does not occur before start_date', () => {
    const daily = mkTask({ kind: 'series', weekdays: [1, 2, 3, 4, 5, 6, 7], start_date: TUE })
    expect(occursOn(daily, MON)).toBe(false)
    expect(occursOn(daily, TUE)).toBe(true)
    expect(occursOn(daily, SAT)).toBe(true)
  })

  it('end_date is inclusive', () => {
    const daily = mkTask({
      kind: 'series',
      weekdays: [1, 2, 3, 4, 5, 6, 7],
      start_date: MON,
      end_date: THU,
    })
    expect(occursOn(daily, THU)).toBe(true)
    expect(occursOn(daily, FRI)).toBe(false)
  })

  it('single with date shows only that day', () => {
    const single = mkTask({ date: TUE })
    expect(occursOn(single, TUE)).toBe(true)
    expect(occursOn(single, MON)).toBe(false)
    expect(occursOn(mkTask({ date: null }), TUE)).toBe(false)
  })

  it('deleted task never occurs', () => {
    expect(occursOn({ ...monThu, deleted_at: '2026-09-01T00:00:00Z' }, MON)).toBe(false)
  })
})

describe('materializeDay', () => {
  it('keys single by id and series by id:date', () => {
    const single = mkTask({ id: 'single-1', date: MON })
    const keys = materializeDay([single, monThu], [], MON).map((i) => i.key)
    expect(keys).toEqual(['series-1:2026-09-07', 'single-1'])
  })

  it('override skipped removes the occurrence only on that date', () => {
    const ov = mkOverride({ series_id: 'series-1', date: MON, skipped: true })
    expect(materializeDay([monThu], [ov], MON)).toHaveLength(0)
    expect(materializeDay([monThu], [ov], TUE)).toHaveLength(1)
  })

  it('override done=true marks only that date', () => {
    const ov = mkOverride({ series_id: 'series-1', date: MON, done: true })
    expect(materializeDay([monThu], [ov], MON)[0]?.done).toBe(true)
    expect(materializeDay([monThu], [ov], TUE)[0]?.done).toBe(false)
  })

  it('ignores the series own done flag', () => {
    const doneSeries = { ...monThu, done: true }
    expect(materializeDay([doneSeries], [], MON)[0]?.done).toBe(false)
  })

  it('override start_min moves only that date', () => {
    const ov = mkOverride({ series_id: 'series-1', date: MON, start_min: 9 * 60, duration_min: 30 })
    const mon = materializeDay([monThu], [ov], MON)[0]
    const tue = materializeDay([monThu], [ov], TUE)[0]
    expect(mon?.start_min).toBe(9 * 60)
    expect(mon?.duration_min).toBe(30)
    expect(tue?.start_min).toBe(18 * 60)
    expect(tue?.duration_min).toBe(60)
  })

  it('ignores deleted override', () => {
    const ov = mkOverride({
      series_id: 'series-1',
      date: MON,
      skipped: true,
      deleted_at: '2026-09-02T00:00:00Z',
    })
    expect(materializeDay([monThu], [ov], MON)).toHaveLength(1)
  })

  it('picks the latest override when several match', () => {
    const older = mkOverride({
      series_id: 'series-1',
      date: MON,
      done: true,
      updated_at: '2026-09-01T00:00:00Z',
    })
    const newer = mkOverride({
      series_id: 'series-1',
      date: MON,
      done: false,
      updated_at: '2026-09-02T00:00:00Z',
    })
    expect(materializeDay([monThu], [older, newer], MON)[0]?.done).toBe(false)
    expect(overrideFor([older, newer], 'series-1', MON)).toBe(newer)
    expect(overrideFor([older, newer], 'series-1', TUE)).toBeNull()
  })

  it('sorts scheduled by start then title, unscheduled after by title', () => {
    const tasks = [
      mkTask({ date: MON, start_min: null, title: 'B any' }),
      mkTask({ date: MON, start_min: 10 * 60, title: 'Late' }),
      mkTask({ date: MON, start_min: null, title: 'A any' }),
      mkTask({ date: MON, start_min: 9 * 60, title: 'Early Z' }),
      mkTask({ date: MON, start_min: 9 * 60, title: 'Early A' }),
    ]
    const titles = materializeDay(tasks, [], MON).map((i) => i.task.title)
    expect(titles).toEqual(['Early A', 'Early Z', 'Late', 'A any', 'B any'])
  })
})

describe('inboxItems', () => {
  it('returns undated, undone, active singles sorted by updated_at desc', () => {
    const older = mkTask({ updated_at: '2026-01-01T00:00:00Z' })
    const newer = mkTask({ updated_at: '2026-02-01T00:00:00Z' })
    const excluded = [
      mkTask({ date: MON }),
      mkTask({ done: true }),
      mkTask({ deleted_at: '2026-01-01T00:00:00Z' }),
      mkTask({ kind: 'series', weekdays: [1], start_date: MON }),
    ]
    expect(inboxItems([older, ...excluded, newer])).toEqual([newer, older])
  })
})

describe('nowAndNext', () => {
  const day = (start: number | null, duration = 60, done = false) =>
    mkTask({ date: MON, start_min: start, duration_min: duration, done })

  it('finds current and next', () => {
    const items = materializeDay([day(9 * 60), day(10 * 60), day(12 * 60), day(null)], [], MON)
    const { current, next } = nowAndNext(items, 10 * 60 + 15)
    expect(current?.start_min).toBe(10 * 60)
    expect(next?.start_min).toBe(12 * 60)
  })

  it('now exactly at end is not current', () => {
    const items = materializeDay([day(9 * 60), day(11 * 60)], [], MON)
    const { current, next } = nowAndNext(items, 10 * 60)
    expect(current).toBeNull()
    expect(next?.start_min).toBe(11 * 60)
  })

  it('skips done items and prefers latest start among overlapping', () => {
    const items = materializeDay([day(9 * 60, 180), day(10 * 60, 60), day(11 * 60, 60, true)], [], MON)
    const { current, next } = nowAndNext(items, 10 * 60 + 30)
    expect(current?.start_min).toBe(10 * 60)
    expect(next).toBeNull()
  })
})

describe('remindersDue', () => {
  it('returns items whose reminder hits exactly this minute', () => {
    const reminded = mkTask({ date: MON, start_min: 9 * 60, remind_min_before: 10 })
    const other = mkTask({ date: MON, start_min: 9 * 60, remind_min_before: 5 })
    const noRemind = mkTask({ date: MON, start_min: 9 * 60 })
    const doneOne = mkTask({ date: MON, start_min: 9 * 60, remind_min_before: 10, done: true })
    const due = remindersDue([reminded, other, noRemind, doneOne], [], MON, 9 * 60 - 10)
    expect(due.map((i) => i.key)).toEqual([reminded.id])
  })

  it('uses the moved start of a series override', () => {
    const series = { ...monThu, remind_min_before: 15 }
    const ov = mkOverride({ series_id: 'series-1', date: MON, start_min: 8 * 60 })
    expect(remindersDue([series], [ov], MON, 8 * 60 - 15)).toHaveLength(1)
    expect(remindersDue([series], [ov], MON, 18 * 60 - 15)).toHaveLength(0)
  })
})
