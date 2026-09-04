import type { CalendarEvent, DayItem } from '@/domain/types'

export type Entry =
  | { kind: 'task'; start: number; end: number; item: DayItem; hero: boolean }
  | { kind: 'event'; start: number; end: number; event: CalendarEvent; hero: false }

export function entryKey(entry: Entry): string {
  return entry.kind === 'task' ? entry.item.key : `ev:${entry.event.id}`
}

export function buildEntries(items: DayItem[], events: CalendarEvent[], heroKey: string | null): Entry[] {
  return [
    ...items.flatMap<Entry>((item) =>
      item.start_min === null
        ? []
        : [{ kind: 'task', start: item.start_min, end: item.start_min + item.duration_min, item, hero: item.key === heroKey }],
    ),
    ...events.flatMap<Entry>((event) =>
      event.all_day
        ? []
        : [{ kind: 'event', start: event.start_min, end: event.start_min + event.duration_min, event, hero: false }],
    ),
  ].sort((a, b) => a.start - b.start)
}

// nowMin === null means another date: nothing is "past", everything is the schedule
export function splitEntries(entries: Entry[], nowMin: number | null): { past: Entry[]; future: Entry[] } {
  if (nowMin === null) return { past: [], future: entries }
  const past: Entry[] = []
  const future: Entry[] = []
  for (const e of entries) (e.end <= nowMin && !e.hero ? past : future).push(e)
  return { past, future }
}

export function pastSummary(past: Entry[]): { count: number; done: number } {
  return {
    count: past.length,
    done: past.filter((e) => e.kind === 'task' && e.item.done).length,
  }
}
