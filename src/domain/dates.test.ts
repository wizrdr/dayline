import { describe, expect, it } from 'vitest'
import {
  addDaysISO,
  clampMin,
  formatDayTitle,
  formatDuration,
  formatMin,
  formatRange,
  fromISODate,
  isoWeekday,
  minutesNow,
  snapMin,
  toISODate,
  todayISO,
  weekDaysAround,
  WEEKDAY_SHORT_RU,
} from './dates'

describe('dates', () => {
  it('round-trips ISO dates at local midnight', () => {
    const d = fromISODate('2026-09-04')
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(8)
    expect(d.getDate()).toBe(4)
    expect(d.getHours()).toBe(0)
    expect(toISODate(d)).toBe('2026-09-04')
    expect(todayISO(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })

  it('adds days across month boundaries', () => {
    expect(addDaysISO('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDaysISO('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('isoWeekday: known Monday and Sunday', () => {
    expect(isoWeekday('2026-09-07')).toBe(1)
    expect(isoWeekday('2026-09-13')).toBe(7)
  })

  it('minutesNow from a Date', () => {
    expect(minutesNow(new Date(2026, 0, 1, 9, 30))).toBe(570)
  })

  it('formats minutes and ranges', () => {
    expect(formatMin(540)).toBe('09:00')
    expect(formatMin(0)).toBe('00:00')
    expect(formatRange(540, 90)).toBe('09:00–10:30')
  })

  it('formatDuration variants', () => {
    expect(formatDuration(30)).toBe('30 мин')
    expect(formatDuration(60)).toBe('1 ч')
    expect(formatDuration(90)).toBe('1 ч 30 мин')
    expect(formatDuration(120)).toBe('2 ч')
  })

  it('weekDaysAround returns Monday..Sunday containing center', () => {
    const week = weekDaysAround('2026-09-10')
    expect(week).toHaveLength(7)
    expect(week[0]).toBe('2026-09-07')
    expect(week[6]).toBe('2026-09-13')
    expect(weekDaysAround('2026-09-13')[0]).toBe('2026-09-07')
    expect(weekDaysAround('2026-09-07')[0]).toBe('2026-09-07')
  })

  it('formatDayTitle', () => {
    const today = '2026-09-04'
    expect(formatDayTitle(today, today)).toBe('Сегодня')
    expect(formatDayTitle('2026-09-05', today)).toBe('Завтра')
    expect(formatDayTitle('2026-09-03', today)).toBe('Вчера')
    expect(formatDayTitle('2026-09-10', today)).toBe('чт, 10 сент.')
  })

  it('weekday labels', () => {
    expect(WEEKDAY_SHORT_RU[1]).toBe('пн')
    expect(WEEKDAY_SHORT_RU[7]).toBe('вс')
  })

  it('clampMin and snapMin', () => {
    expect(clampMin(-5)).toBe(0)
    expect(clampMin(2000)).toBe(1439)
    expect(snapMin(63)).toBe(65)
    expect(snapMin(62)).toBe(60)
    expect(snapMin(67, 15)).toBe(60)
  })
})
