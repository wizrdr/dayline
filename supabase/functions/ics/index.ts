import { createClient } from '@supabase/supabase-js'
import { expandIcs, isValidTimeZone, type IcsEvent } from '../_shared/ics.ts'

const DAY_MS = 86_400_000
const DAYS_BACK = 7
const DAYS_AHEAD = 30
const FETCH_TIMEOUT_MS = 10_000
const DEFAULT_TZ = 'Europe/Warsaw'

interface RequestBody {
  feed_id?: unknown
  tz?: unknown
}

interface FeedRow {
  url: string
}

interface OkResponse {
  events: IcsEvent[]
  fetched_at: string
}

function corsHeaders(req: Request): HeadersInit {
  return {
    'Access-Control-Allow-Origin': req.headers.get('Origin') ?? '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

function json(req: Request, status: number, body: OkResponse | { error: string }): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  })
}

function env(name: string): string {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Missing env ${name}`)
  return value
}

async function readBody(req: Request): Promise<RequestBody> {
  try {
    const parsed: unknown = await req.json()
    return typeof parsed === 'object' && parsed !== null ? (parsed as RequestBody) : {}
  } catch {
    return {}
  }
}

function toHttps(url: string): string {
  return url.replace(/^webcal:\/\//i, 'https://')
}

async function fetchIcs(url: string): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(toHttps(url), {
      signal: controller.signal,
      redirect: 'follow',
      headers: { Accept: 'text/calendar, text/plain;q=0.9, */*;q=0.8' },
    })
    if (!res.ok) throw new Error(`upstream status ${res.status}`)
    return await res.text()
  } finally {
    clearTimeout(timer)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(req) })
  if (req.method !== 'POST') return json(req, 405, { error: 'method not allowed' })

  const authorization = req.headers.get('Authorization')
  if (!authorization) return json(req, 401, { error: 'unauthorized' })

  const supabase = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) return json(req, 401, { error: 'unauthorized' })

  const body = await readBody(req)
  if (typeof body.feed_id !== 'string' || body.feed_id.length === 0) {
    return json(req, 400, { error: 'feed_id required' })
  }
  const tz = typeof body.tz === 'string' ? body.tz : DEFAULT_TZ
  if (!isValidTimeZone(tz)) return json(req, 400, { error: 'invalid tz' })

  const { data: feed, error: feedError } = await supabase
    .from('ics_feeds')
    .select('url')
    .eq('id', body.feed_id)
    .is('deleted_at', null)
    .maybeSingle<FeedRow>()
  if (feedError) return json(req, 500, { error: 'feed lookup failed' })
  if (!feed) return json(req, 404, { error: 'feed not found' })

  let icsText: string
  try {
    icsText = await fetchIcs(feed.url)
  } catch (e) {
    console.error('ics fetch failed', body.feed_id, e instanceof Error ? e.name : 'unknown')
    return json(req, 502, { error: 'calendar fetch failed' })
  }

  const now = Date.now()
  try {
    const events = expandIcs(icsText, {
      from: new Date(now - DAYS_BACK * DAY_MS),
      to: new Date(now + DAYS_AHEAD * DAY_MS),
      tz,
    })
    return json(req, 200, { events, fetched_at: new Date(now).toISOString() })
  } catch (e) {
    console.error('ics parse failed', body.feed_id, e instanceof Error ? e.name : 'unknown')
    return json(req, 502, { error: 'calendar parse failed' })
  }
})
