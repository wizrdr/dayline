import { addDays, format, getISODay, parse, startOfISOWeek } from 'date-fns'
import { ru } from 'date-fns/locale'
import type { ISODate, Weekday } from './types.ts'

const ISO_FORMAT = 'yyyy-MM-dd'

export function toISODate(d: Date): ISODate {
  return format(d, ISO_FORMAT)
}

export function fromISODate(s: ISODate): Date {
  return parse(s, ISO_FORMAT, new Date(0, 0, 1))
}

export function todayISO(now: Date = new Date()): ISODate {
  return toISODate(now)
}

export function addDaysISO(s: ISODate, n: number): ISODate {
  return toISODate(addDays(fromISODate(s), n))
}

export function isoWeekday(s: ISODate): Weekday {
  return getISODay(fromISODate(s)) as Weekday
}

export function minutesNow(now: Date = new Date()): number {
  return now.getHours() * 60 + now.getMinutes()
}

export function formatMin(min: number): string {
  const h = Math.floor(min / 60) % 24
  const m = min % 60
  return `${pad2(h)}:${pad2(m)}`
}

export function formatRange(start: number, duration: number): string {
  return `${formatMin(start)}–${formatMin(start + duration)}`
}

export function formatDuration(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m} мин`
  if (m === 0) return `${h} ч`
  return `${h} ч ${m} мин`
}

export function weekDaysAround(center: ISODate): ISODate[] {
  const monday = startOfISOWeek(fromISODate(center))
  return Array.from({ length: 7 }, (_, i) => toISODate(addDays(monday, i)))
}

export const WEEKDAY_SHORT_RU: Record<Weekday, string> = {
  1: 'пн',
  2: 'вт',
  3: 'ср',
  4: 'чт',
  5: 'пт',
  6: 'сб',
  7: 'вс',
}

export function formatDayTitle(s: ISODate, today: ISODate): string {
  if (s === today) return 'Сегодня'
  if (s === addDaysISO(today, 1)) return 'Завтра'
  if (s === addDaysISO(today, -1)) return 'Вчера'
  return format(fromISODate(s), 'EEEEEE, d MMM', { locale: ru })
}

export function clampMin(n: number): number {
  return Math.min(1439, Math.max(0, n))
}

export function snapMin(n: number, step = 5): number {
  return Math.round(n / step) * step
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}
