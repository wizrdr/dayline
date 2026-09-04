import ICAL from 'ical.js'

export interface IcsEvent {
  id: string
  title: string
  date: string
  start_min: number
  duration_min: number
  all_day: boolean
}

export interface ExpandOptions {
  from: Date
  to: Date
  tz: string
}

interface Occurrence {
  event: ICAL.Event
  start: ICAL.Time
  end: ICAL.Time
  startTz: string | null
  endTz: string | null
}

interface LocalTime {
  date: string
  minutes: number
}

const DAY_MIN = 1440
const MAX_ITERATIONS = 20_000
const MAX_ALL_DAY_SPAN = 366
const UNTITLED = '(без названия)'

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

export function expandIcs(icsText: string, opts: ExpandOptions): IcsEvent[] {
  const root = new ICAL.Component(ICAL.parse(icsText))
  const events: IcsEvent[] = []
  for (const master of groupEvents(root.getAllSubcomponents('vevent'))) {
    for (const occ of occurrencesOf(master, opts)) {
      events.push(...toIcsEvents(occ, opts))
    }
  }
  return events.sort((a, b) => a.date.localeCompare(b.date) || a.start_min - b.start_min)
}

function groupEvents(components: ICAL.Component[]): ICAL.Event[] {
  const masters = new Map<string, ICAL.Event>()
  const exceptions: ICAL.Event[] = []
  for (const c of components) {
    const ev = new ICAL.Event(c, { strictExceptions: true, exceptions: [] })
    if (ev.isRecurrenceException()) exceptions.push(ev)
    else masters.set(ev.uid, ev)
  }
  const orphans: ICAL.Event[] = []
  for (const ex of exceptions) {
    const master = masters.get(ex.uid)
    if (master?.isRecurring()) master.relateException(ex)
    else orphans.push(ex)
  }
  return [...masters.values(), ...orphans]
}

function isCancelled(ev: ICAL.Event): boolean {
  const status = ev.component.getFirstPropertyValue('status')
  return String(status ?? '').toUpperCase() === 'CANCELLED'
}

function occurrence(ev: ICAL.Event, start: ICAL.Time, end: ICAL.Time): Occurrence {
  const startTz = paramTzid(ev.component, 'dtstart')
  return { event: ev, start, end, startTz, endTz: paramTzid(ev.component, 'dtend') ?? startTz }
}

function occurrencesOf(ev: ICAL.Event, opts: ExpandOptions): Occurrence[] {
  if (!ev.isRecurring()) {
    return isCancelled(ev) ? [] : [occurrence(ev, ev.startDate, ev.endDate)]
  }
  const result: Occurrence[] = []
  const iter = ev.iterator()
  const toMs = opts.to.getTime()
  const masterTz = paramTzid(ev.component, 'dtstart')
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const next = iter.next()
    if (!next) break
    if (toInstant(next, masterTz, opts.tz).getTime() >= toMs) break
    const details = ev.getOccurrenceDetails(next)
    if (isCancelled(details.item)) continue
    result.push(occurrence(details.item, details.startDate, details.endDate))
  }
  return result
}

function paramTzid(comp: ICAL.Component, prop: string): string | null {
  const value = comp.getFirstProperty(prop)?.getParameter('tzid')
  const tzid = Array.isArray(value) ? value[0] : value
  return typeof tzid === 'string' && tzid.length > 0 ? tzid : null
}

function toIcsEvents(occ: Occurrence, opts: ExpandOptions): IcsEvent[] {
  const title = occ.event.summary?.trim() || UNTITLED
  const uid = occ.event.uid
  if (occ.start.isDate) return allDayEvents(uid, title, occ, opts)

  const startInstant = toInstant(occ.start, occ.startTz, opts.tz)
  const ms = startInstant.getTime()
  if (ms < opts.from.getTime() || ms >= opts.to.getTime()) return []

  const start = toLocal(startInstant, opts.tz)
  const end = toLocal(toInstant(occ.end, occ.endTz, opts.tz), opts.tz)
  const duration = end.date === start.date ? Math.max(0, end.minutes - start.minutes) : DAY_MIN - start.minutes
  return [
    {
      id: makeId(uid, startInstant.toISOString()),
      title,
      date: start.date,
      start_min: start.minutes,
      duration_min: duration,
      all_day: false,
    },
  ]
}

function allDayEvents(uid: string, title: string, occ: Occurrence, opts: ExpandOptions): IcsEvent[] {
  const fromDate = toLocal(opts.from, opts.tz).date
  const toDate = toLocal(opts.to, opts.tz).date
  const endKey = dateKey(occ.end)
  const result: IcsEvent[] = []
  const cursor = occ.start.clone()
  do {
    const day = dateKey(cursor)
    if (day >= fromDate && day <= toDate) {
      result.push({ id: makeId(uid, day), title, date: day, start_min: 0, duration_min: DAY_MIN, all_day: true })
    }
    cursor.adjust(1, 0, 0, 0)
  } while (dateKey(cursor) < endKey && result.length < MAX_ALL_DAY_SPAN)
  return result
}

function dateKey(t: ICAL.Time): string {
  return `${t.year}-${pad(t.month)}-${pad(t.day)}`
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function zoneTzid(t: ICAL.Time): string | null {
  const tzid = t.zone?.tzid
  return !tzid || tzid === 'floating' ? null : tzid
}

function isUtc(t: ICAL.Time): boolean {
  const tzid = zoneTzid(t)
  return tzid === 'UTC' || tzid === 'Z'
}

// TZID param is the fallback when no VTIMEZONE resolved the zone; Intl knows IANA names anyway.
export function toInstant(t: ICAL.Time, paramTz: string | null, fallbackTz: string): Date {
  if (isUtc(t)) return t.toJSDate()
  const tzid = zoneTzid(t) ?? paramTz
  if (tzid && isValidTimeZone(tzid)) return wallToInstant(t, tzid)
  if (zoneTzid(t)) return t.toJSDate()
  return wallToInstant(t, fallbackTz)
}

function wallToInstant(t: ICAL.Time, tz: string): Date {
  const guess = Date.UTC(t.year, t.month - 1, t.day, t.hour, t.minute, t.second)
  const first = guess - offsetAt(guess, tz)
  const second = guess - offsetAt(first, tz)
  return new Date(second)
}

function offsetAt(ms: number, tz: string): number {
  const p = parts(new Date(ms), tz)
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
  return asUtc - Math.floor(ms / 1000) * 1000
}

interface Parts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

const formatters = new Map<string, Intl.DateTimeFormat>()

function formatter(tz: string): Intl.DateTimeFormat {
  let f = formatters.get(tz)
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    formatters.set(tz, f)
  }
  return f
}

function parts(d: Date, tz: string): Parts {
  const out: Record<string, number> = {}
  for (const p of formatter(tz).formatToParts(d)) {
    if (p.type !== 'literal') out[p.type] = Number(p.value)
  }
  return {
    year: out.year ?? 1970,
    month: out.month ?? 1,
    day: out.day ?? 1,
    hour: (out.hour ?? 0) % 24,
    minute: out.minute ?? 0,
    second: out.second ?? 0,
  }
}

export function toLocal(d: Date, tz: string): LocalTime {
  const p = parts(d, tz)
  return { date: `${p.year}-${pad(p.month)}-${pad(p.day)}`, minutes: p.hour * 60 + p.minute }
}

function makeId(uid: string, suffix: string): string {
  const id = `${uid}:${suffix}`
  return id.length <= 200 ? id : `${fnv1a(uid)}:${suffix}`
}

function fnv1a(s: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(16).padStart(8, '0')
}
