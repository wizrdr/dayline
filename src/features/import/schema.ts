import type { NewRow } from '@/db/repo'
import { fromISODate, toISODate } from '@/domain/dates'
import type { ISODate, Task, TaskColor, Weekday } from '@/domain/types'

export type ParseResult = { ok: true; tasks: NewRow<Task>[] } | { ok: false; errors: string[] }

const COLOR_NAMES: Record<string, TaskColor> = {
  red: 1,
  orange: 2,
  yellow: 3,
  green: 4,
  teal: 5,
  blue: 6,
  purple: 7,
  pink: 8,
}

const WEEKDAY_NAMES: Record<string, Weekday> = {
  mon: 1, monday: 1, пн: 1,
  tue: 2, tuesday: 2, вт: 2,
  wed: 3, wednesday: 3, ср: 3,
  thu: 4, thursday: 4, чт: 4,
  fri: 5, friday: 5, пт: 5,
  sat: 6, saturday: 6, сб: 6,
  sun: 7, sunday: 7, вс: 7,
}

const WEEKDAY_ALIASES: Record<string, Weekday[]> = {
  daily: [1, 2, 3, 4, 5, 6, 7],
  everyday: [1, 2, 3, 4, 5, 6, 7],
  weekdays: [1, 2, 3, 4, 5],
  weekends: [6, 7],
}

export const EXAMPLE_JSON = JSON.stringify(
  {
    version: 1,
    tasks: [
      { title: 'Anki', start: '09:00', duration: 30, color: 'green', repeat: 'daily', from: '2026-09-21' },
      { title: 'Логистика переезда', start: '18:00', duration: '1h', color: 'blue', repeat: ['mon', 'tue', 'wed', 'thu'], from: '2026-09-21' },
      { title: 'Большой блок', start: '11:00', duration: '3h', color: 'purple', repeat: ['sat'], from: '2026-09-21' },
      { title: 'Обзор недели', start: '21:00', duration: 45, color: 'orange', repeat: ['sun'], from: '2026-09-21', remind: 10 },
    ],
  },
  null,
  2,
)

export function parseImport(text: string, today: ISODate): ParseResult {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    return { ok: false, errors: ['Не удалось разобрать JSON'] }
  }

  const items = extractTasks(json)
  if (!items) return { ok: false, errors: ['Ожидается объект с полем "tasks" или массив задач'] }
  if (items.length === 0) return { ok: false, errors: ['Список задач пуст'] }

  const tasks: NewRow<Task>[] = []
  const errors: string[] = []
  items.forEach((item, i) => {
    const res = parseTask(item, i + 1, today)
    if (res.ok) tasks.push(res.task)
    else errors.push(...res.errors)
  })
  return errors.length ? { ok: false, errors } : { ok: true, tasks }
}

function extractTasks(json: unknown): unknown[] | null {
  if (Array.isArray(json)) return json
  if (isRecord(json) && Array.isArray(json.tasks)) return json.tasks
  return null
}

type TaskResult = { ok: true; task: NewRow<Task> } | { ok: false; errors: string[] }

function parseTask(raw: unknown, n: number, today: ISODate): TaskResult {
  const errors: string[] = []
  const fail = (msg: string) => errors.push(`Задача ${n}: ${msg}`)
  if (!isRecord(raw)) return { ok: false, errors: [`Задача ${n}: ожидается объект`] }

  const title = typeof raw.title === 'string' ? raw.title.trim() : ''
  if (!title) fail('не указано название')

  const start_min = parseStart(raw.start, fail)
  const duration_min = parseDuration(raw.duration, fail)
  const color = parseColor(raw.color, fail)
  const note = parseNote(raw.note, fail)
  const remind_min_before = parseRemind(raw.remind, fail)
  const date = parseDateField(raw.date, 'date', fail)
  const weekdays = parseRepeat(raw.repeat, fail)
  const from = parseDateField(raw.from, 'from', fail)
  const until = parseDateField(raw.until, 'until', fail)

  if (date && weekdays) fail('укажите либо "date", либо "repeat", но не оба')
  if (from && until && until < from) fail(`"until" (${until}) раньше "from" (${from})`)

  if (errors.length) return { ok: false, errors }

  const base = { title, note, color, start_min, duration_min, done: false, remind_min_before }
  if (weekdays) {
    return {
      ok: true,
      task: { ...base, kind: 'series', date: null, weekdays, start_date: from ?? today, end_date: until },
    }
  }
  return { ok: true, task: { ...base, kind: 'single', date, weekdays: null, start_date: null, end_date: null } }
}

type Fail = (msg: string) => void

function parseStart(v: unknown, fail: Fail): number | null {
  if (v == null || v === '') return null
  const match = typeof v === 'string' ? /^(\d{1,2}):(\d{2})$/.exec(v.trim()) : null
  const h = match ? Number(match[1]) : NaN
  const m = match ? Number(match[2]) : NaN
  if (!match || h > 23 || m > 59) {
    fail(`неверное время ${quote(v)}`)
    return null
  }
  return h * 60 + m
}

function parseDuration(v: unknown, fail: Fail): number {
  if (v == null) return 60
  if (typeof v === 'number') {
    if (Number.isInteger(v) && v > 0) return v
  } else if (typeof v === 'string') {
    const s = v.trim().toLowerCase()
    if (/^\d+$/.test(s) && Number(s) > 0) return Number(s)
    const match = /^(?:(\d+)\s*(?:h|ч))?\s*(?:(\d+)\s*(?:m|min|м|мин))?$/.exec(s)
    if (match && s && (match[1] || match[2])) {
      const total = Number(match[1] ?? 0) * 60 + Number(match[2] ?? 0)
      if (total > 0) return total
    }
  }
  fail(`неверная длительность ${quote(v)}`)
  return 60
}

function parseColor(v: unknown, fail: Fail): TaskColor {
  if (v == null) return 1
  if (typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 8) return v as TaskColor
  if (typeof v === 'string') {
    const named = COLOR_NAMES[v.trim().toLowerCase()]
    if (named) return named
  }
  fail(`неверный цвет ${quote(v)} (1..8 или red, orange, yellow, green, teal, blue, purple, pink)`)
  return 1
}

function parseNote(v: unknown, fail: Fail): string {
  if (v == null) return ''
  if (typeof v === 'string') return v
  fail('заметка должна быть строкой')
  return ''
}

function parseRemind(v: unknown, fail: Fail): number | null {
  if (v == null) return null
  if (typeof v === 'number' && Number.isInteger(v) && v >= 0) return v
  fail(`неверное напоминание ${quote(v)} (минуты до начала, 0 = в момент начала)`)
  return null
}

function parseDateField(v: unknown, field: string, fail: Fail): ISODate | null {
  if (v == null || v === '') return null
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const d = fromISODate(v)
    if (!Number.isNaN(d.getTime()) && toISODate(d) === v) return v
  }
  fail(`неверная дата в "${field}": ${quote(v)} (ожидается ГГГГ-ММ-ДД)`)
  return null
}

function parseRepeat(v: unknown, fail: Fail): Weekday[] | null {
  if (v == null) return null
  const parts = Array.isArray(v) ? v : [v]
  const days = new Set<Weekday>()
  for (const part of parts) {
    const key = typeof part === 'string' ? part.trim().toLowerCase() : ''
    const alias = WEEKDAY_ALIASES[key]
    const day = WEEKDAY_NAMES[key]
    if (alias) alias.forEach((d) => days.add(d))
    else if (day) days.add(day)
    else fail(`неверный день недели ${quote(part)}`)
  }
  if (days.size === 0) {
    fail('"repeat" не содержит дней недели')
    return null
  }
  return [...days].sort((a, b) => a - b)
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function quote(v: unknown): string {
  return typeof v === 'string' ? `"${v}"` : JSON.stringify(v)
}
