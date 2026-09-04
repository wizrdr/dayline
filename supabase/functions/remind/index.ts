import { createClient, type SupabaseClient } from '@supabase/supabase-js'
// @ts-types="npm:@types/web-push@3"
import webpush from 'web-push'
import { formatDuration, formatMin } from '../../../src/domain/dates.ts'
import { remindersDue } from '../../../src/domain/recurrence.ts'
import type { DayItem, ISODate, PushSubscriptionRow, Task, TaskOverride } from '../../../src/domain/types.ts'

interface Summary {
  sent: number
  removed: number
  checked_at: string
}

interface LocalClock {
  date: ISODate
  minute: number
}

interface PushPayload {
  title: string
  body: string
  url: string
}

type SendOutcome = 'sent' | 'gone' | 'failed'

const DEDUP_TTL_MS = 120_000
const fired = new Map<string, number>()

function env(name: string): string {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Missing env ${name}`)
  return value
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function localClock(now: Date, tz: string): LocalClock {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '00'
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    minute: Number(get('hour')) * 60 + Number(get('minute')),
  }
}

function safeLocalClock(now: Date, tz: string): LocalClock {
  try {
    return localClock(now, tz)
  } catch {
    return localClock(now, 'UTC')
  }
}

function alreadyFired(key: string, nowMs: number): boolean {
  for (const [k, at] of fired) if (nowMs - at > DEDUP_TTL_MS) fired.delete(k)
  if (fired.has(key)) return true
  fired.set(key, nowMs)
  return false
}

function payloadFor(item: DayItem): PushPayload {
  const start = item.start_min ?? 0
  const before = item.task.remind_min_before ?? 0
  const body = before === 0 ? `в ${formatMin(start)}` : `через ${formatDuration(before)} · ${formatMin(start)}`
  return { title: item.task.title, body, url: '/dayline/' }
}

function rows<T>(result: { data: unknown; error: { message: string } | null }): T[] {
  if (result.error) throw new Error(result.error.message)
  return (result.data ?? []) as T[]
}

async function loadSubscriptions(db: SupabaseClient): Promise<PushSubscriptionRow[]> {
  return rows<PushSubscriptionRow>(await db.from('push_subscriptions').select('*'))
}

async function loadTasks(db: SupabaseClient, userId: string): Promise<Task[]> {
  return rows<Task>(
    await db
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .not('remind_min_before', 'is', null),
  )
}

async function loadOverrides(db: SupabaseClient, userId: string, dates: ISODate[]): Promise<TaskOverride[]> {
  return rows<TaskOverride>(
    await db.from('task_overrides').select('*').eq('user_id', userId).is('deleted_at', null).in('date', dates),
  )
}

async function deleteSubscription(db: SupabaseClient, id: string): Promise<void> {
  const { error } = await db.from('push_subscriptions').delete().eq('id', id)
  if (error) console.error('delete subscription failed', error.message)
}

async function sendPush(sub: PushSubscriptionRow, payload: PushPayload): Promise<SendOutcome> {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
      { TTL: 120 },
    )
    return 'sent'
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode
    if (status === 404 || status === 410) return 'gone'
    console.error('push failed', status ?? 'no status')
    return 'failed'
  }
}

function groupByUser(subs: PushSubscriptionRow[]): Map<string, PushSubscriptionRow[]> {
  const map = new Map<string, PushSubscriptionRow[]>()
  for (const sub of subs) map.set(sub.user_id, [...(map.get(sub.user_id) ?? []), sub])
  return map
}

async function remindSubscription(
  db: SupabaseClient,
  sub: PushSubscriptionRow,
  tasks: Task[],
  overrides: TaskOverride[],
  now: Date,
  summary: Summary,
): Promise<void> {
  const { date, minute } = safeLocalClock(now, sub.tz)
  if (alreadyFired(`${sub.id}:${date}:${minute}`, now.getTime())) return
  for (const item of remindersDue(tasks, overrides, date, minute)) {
    const outcome = await sendPush(sub, payloadFor(item))
    if (outcome === 'sent') summary.sent++
    if (outcome === 'gone') {
      await deleteSubscription(db, sub.id)
      summary.removed++
      return
    }
  }
}

async function remindUser(db: SupabaseClient, subs: PushSubscriptionRow[], now: Date, summary: Summary): Promise<void> {
  const userId = subs[0]!.user_id
  const dates = [...new Set(subs.map((s) => safeLocalClock(now, s.tz).date))]
  const [tasks, overrides] = await Promise.all([loadTasks(db, userId), loadOverrides(db, userId, dates)])
  if (tasks.length === 0) return
  for (const sub of subs) await remindSubscription(db, sub, tasks, overrides, now, summary)
}

async function run(): Promise<Summary> {
  webpush.setVapidDetails(env('VAPID_SUBJECT'), env('VAPID_PUBLIC_KEY'), env('VAPID_PRIVATE_KEY'))
  const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const now = new Date()
  now.setSeconds(0, 0)
  const summary: Summary = { sent: 0, removed: 0, checked_at: now.toISOString() }
  for (const subs of groupByUser(await loadSubscriptions(db)).values()) {
    await remindUser(db, subs, now, summary)
  }
  console.log('remind', JSON.stringify(summary))
  return summary
}

Deno.serve(async (req) => {
  if (req.headers.get('x-cron-secret') !== Deno.env.get('CRON_SECRET')) return json({ error: 'forbidden' }, 403)
  try {
    return json(await run())
  } catch (e) {
    console.error('remind failed', e instanceof Error ? e.message : String(e))
    return json({ sent: 0, removed: 0, checked_at: new Date().toISOString(), error: 'internal' }, 500)
  }
})
