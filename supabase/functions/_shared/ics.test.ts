import { assertEquals } from 'jsr:@std/assert@1'
import { expandIcs, type IcsEvent } from './ics.ts'

const TZ = 'Europe/Warsaw'
const WINDOW = { from: new Date('2026-08-31T00:00:00Z'), to: new Date('2026-10-05T00:00:00Z'), tz: TZ }

function calendar(body: string): string {
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//test//EN', body.trim(), 'END:VCALENDAR'].join('\r\n')
}

function vevent(lines: string[]): string {
  return ['BEGIN:VEVENT', ...lines, 'END:VEVENT'].join('\r\n')
}

function slots(events: IcsEvent[]): string[] {
  return events.map((e) => `${e.date} ${e.start_min}+${e.duration_min}`)
}

Deno.test('simple timed event in Warsaw local time', () => {
  const ics = calendar(
    vevent([
      'UID:simple@test',
      'DTSTART;TZID=Europe/Warsaw:20260904T100000',
      'DTEND;TZID=Europe/Warsaw:20260904T113000',
      'SUMMARY:Standup',
    ]),
  )
  const events = expandIcs(ics, WINDOW)
  assertEquals(events.length, 1)
  assertEquals(events[0], {
    id: 'simple@test:2026-09-04T08:00:00.000Z',
    title: 'Standup',
    date: '2026-09-04',
    start_min: 600,
    duration_min: 90,
    all_day: false,
  })
})

Deno.test('weekly RRULE expands inside the window and honours EXDATE', () => {
  const ics = calendar(
    vevent([
      'UID:weekly@test',
      'DTSTART;TZID=Europe/Warsaw:20260901T090000',
      'DTEND;TZID=Europe/Warsaw:20260901T093000',
      'RRULE:FREQ=WEEKLY;BYDAY=TU',
      'EXDATE;TZID=Europe/Warsaw:20260915T090000',
      'SUMMARY:Weekly',
    ]),
  )
  const events = expandIcs(ics, WINDOW)
  assertEquals(
    events.map((e) => e.date),
    ['2026-09-01', '2026-09-08', '2026-09-22', '2026-09-29'],
  )
  assertEquals(new Set(slots(events)).size, 4)
  for (const e of events) {
    assertEquals(e.start_min, 540)
    assertEquals(e.duration_min, 30)
  }
})

Deno.test('all-day event spanning two days becomes one row per day', () => {
  const ics = calendar(
    vevent(['UID:allday@test', 'DTSTART;VALUE=DATE:20260910', 'DTEND;VALUE=DATE:20260912', 'SUMMARY:Offsite']),
  )
  const events = expandIcs(ics, WINDOW)
  assertEquals(slots(events), ['2026-09-10 0+1440', '2026-09-11 0+1440'])
  assertEquals(events.every((e) => e.all_day), true)
  assertEquals(events[0].id, 'allday@test:2026-09-10')
})

Deno.test('RECURRENCE-ID override moves a single occurrence', () => {
  const ics = calendar(
    [
      vevent([
        'UID:moved@test',
        'DTSTART;TZID=Europe/Warsaw:20260902T140000',
        'DTEND;TZID=Europe/Warsaw:20260902T150000',
        'RRULE:FREQ=WEEKLY;BYDAY=WE;COUNT=3',
        'SUMMARY:Sync',
      ]),
      vevent([
        'UID:moved@test',
        'RECURRENCE-ID;TZID=Europe/Warsaw:20260909T140000',
        'DTSTART;TZID=Europe/Warsaw:20260910T160000',
        'DTEND;TZID=Europe/Warsaw:20260910T163000',
        'SUMMARY:Sync (moved)',
      ]),
    ].join('\r\n'),
  )
  const events = expandIcs(ics, WINDOW)
  assertEquals(slots(events), ['2026-09-02 840+60', '2026-09-10 960+30', '2026-09-16 840+60'])
  assertEquals(events[1].title, 'Sync (moved)')
})

Deno.test('CANCELLED events are skipped, including a cancelled occurrence override', () => {
  const ics = calendar(
    [
      vevent([
        'UID:cancelled@test',
        'DTSTART;TZID=Europe/Warsaw:20260903T100000',
        'DTEND;TZID=Europe/Warsaw:20260903T110000',
        'STATUS:CANCELLED',
        'SUMMARY:Gone',
      ]),
      vevent([
        'UID:series@test',
        'DTSTART;TZID=Europe/Warsaw:20260904T100000',
        'DTEND;TZID=Europe/Warsaw:20260904T110000',
        'RRULE:FREQ=DAILY;COUNT=2',
        'SUMMARY:Daily',
      ]),
      vevent([
        'UID:series@test',
        'RECURRENCE-ID;TZID=Europe/Warsaw:20260905T100000',
        'DTSTART;TZID=Europe/Warsaw:20260905T100000',
        'DTEND;TZID=Europe/Warsaw:20260905T110000',
        'STATUS:CANCELLED',
        'SUMMARY:Daily',
      ]),
    ].join('\r\n'),
  )
  const events = expandIcs(ics, WINDOW)
  assertEquals(slots(events), ['2026-09-04 600+60'])
})

Deno.test('event in another TZID is converted to Europe/Warsaw', () => {
  const ics = calendar(
    vevent([
      'UID:ny@test',
      'DTSTART;TZID=America/New_York:20260908T090000',
      'DTEND;TZID=America/New_York:20260908T100000',
      'SUMMARY:NY call',
    ]),
  )
  const events = expandIcs(ics, WINDOW)
  assertEquals(slots(events), ['2026-09-08 900+60'])
})

Deno.test('UTC event crossing local midnight is clipped to its start date', () => {
  const ics = calendar(
    vevent(['UID:late@test', 'DTSTART:20260908T210000Z', 'DTEND:20260909T010000Z', 'SUMMARY:Late']),
  )
  const events = expandIcs(ics, WINDOW)
  assertEquals(slots(events), ['2026-09-08 1380+60'])
})

Deno.test('events outside the window and empty SUMMARY are handled', () => {
  const ics = calendar(
    [
      vevent(['UID:old@test', 'DTSTART:20260101T100000Z', 'DTEND:20260101T110000Z', 'SUMMARY:Old']),
      vevent(['UID:untitled@test', 'DTSTART:20260908T100000Z', 'DTEND:20260908T110000Z']),
    ].join('\r\n'),
  )
  const events = expandIcs(ics, WINDOW)
  assertEquals(events.length, 1)
  assertEquals(events[0].title, '(без названия)')
})

Deno.test('VTIMEZONE feed keeps wall-clock time across the DST change', () => {
  const ics = calendar(
    [
      'BEGIN:VTIMEZONE',
      'TZID:Europe/Warsaw',
      'BEGIN:DAYLIGHT',
      'TZOFFSETFROM:+0100',
      'TZOFFSETTO:+0200',
      'TZNAME:CEST',
      'DTSTART:19700329T020000',
      'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
      'END:DAYLIGHT',
      'BEGIN:STANDARD',
      'TZOFFSETFROM:+0200',
      'TZOFFSETTO:+0100',
      'TZNAME:CET',
      'DTSTART:19701025T030000',
      'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
      'END:STANDARD',
      'END:VTIMEZONE',
      vevent([
        'UID:dst@test',
        'DTSTART;TZID=Europe/Warsaw:20261022T100000',
        'DTEND;TZID=Europe/Warsaw:20261022T110000',
        'RRULE:FREQ=WEEKLY;BYDAY=TH;COUNT=2',
        'SUMMARY:Across DST',
      ]),
    ].join('\r\n'),
  )
  const events = expandIcs(ics, {
    from: new Date('2026-10-20T00:00:00Z'),
    to: new Date('2026-11-01T00:00:00Z'),
    tz: TZ,
  })
  assertEquals(slots(events), ['2026-10-22 600+60', '2026-10-29 600+60'])
  assertEquals(events[1].id, 'dst@test:2026-10-29T09:00:00.000Z')
})
