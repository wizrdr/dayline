#!/usr/bin/env node
// Sync recurring series from the schedule-as-code JSON into Supabase. See docs/schedule-as-code.md.
import { readFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { homedir } from 'node:os'
import { join } from 'node:path'

const PROJECT_REF = 'ghuhochssdbzyxextlso'
const DEFAULT_FILE = '/Users/maksimhryshchanka/Documents/Obsidian Vault/personal/career-plan/dayline-schedule.json'
const EMAIL = process.env.DAYLINE_EMAIL ?? 'm.hryshchanka@wowmaking.net'
const FIELDS = ['title', 'note', 'color', 'icon', 'start_min', 'duration_min', 'weekdays', 'start_date', 'end_date', 'remind_min_before']

const COLOR_NAMES = { red: 1, orange: 2, yellow: 3, green: 4, teal: 5, blue: 6, purple: 7, pink: 8 }
const WEEKDAY_NAMES = {
  mon: 1, monday: 1, пн: 1, tue: 2, tuesday: 2, вт: 2, wed: 3, wednesday: 3, ср: 3, thu: 4, thursday: 4, чт: 4,
  fri: 5, friday: 5, пт: 5, sat: 6, saturday: 6, сб: 6, sun: 7, sunday: 7, вс: 7,
}
const WEEKDAY_ALIASES = { daily: [1, 2, 3, 4, 5, 6, 7], everyday: [1, 2, 3, 4, 5, 6, 7], weekdays: [1, 2, 3, 4, 5], weekends: [6, 7] }
const ICON_NAMES = [
  'cards', 'box', 'globe', 'bowl', 'book', 'briefcase', 'dumbbell', 'run', 'code', 'phone', 'mail', 'cart', 'home',
  'heart', 'coffee', 'music', 'pen', 'users', 'brain', 'sun', 'moon', 'star', 'bell', 'flag', 'check',
]
const SUGGEST = [
  [/anki|карточк|слов/i, 'cards'], [/логист|переезд|перевоз|коробк/i, 'box'], [/italki|англ|язык|english|урок/i, 'globe'],
  [/обед|ужин|завтрак|еда|готов/i, 'bowl'], [/чтени|книг|read/i, 'book'], [/работ|мит|созвон|стендап|встреч/i, 'briefcase'],
  [/зал|трен|спорт|йога/i, 'dumbbell'], [/бег|прогулк|собак/i, 'run'], [/код|программ|side|проект|dev/i, 'code'],
  [/звон|позвон|call/i, 'phone'], [/почт|письм|mail|аутрич/i, 'mail'], [/магазин|купить|покуп/i, 'cart'],
  [/дом|убор|стирк/i, 'home'], [/кофе|перерыв|отдых/i, 'coffee'], [/музык|подкаст/i, 'music'],
  [/писать|памятк|заметк|дневник|ревью|обзор/i, 'pen'], [/дебат|club|клуб|люди|семь/i, 'users'],
  [/учеб|курс|изуч|lesson/i, 'brain'], [/утро/i, 'sun'], [/сон|вечер|ночь/i, 'moon'],
]

const quote = (v) => (typeof v === 'string' ? `"${v}"` : JSON.stringify(v))
const isRecord = (v) => typeof v === 'object' && v !== null && !Array.isArray(v)

function parseTask(raw, n) {
  const errors = []
  const fail = (msg) => errors.push(`Задача ${n}: ${msg}`)
  if (!isRecord(raw)) return { errors: [`Задача ${n}: ожидается объект`] }
  const key = typeof raw.key === 'string' && /^[a-z0-9][a-z0-9-]*$/.test(raw.key) ? raw.key : null
  if (!key) fail(`нужен "key" — slug из [a-z0-9-], получено ${quote(raw.key)}`)
  const title = typeof raw.title === 'string' ? raw.title.trim() : ''
  if (!title) fail('не указано название')
  if (raw.date != null) fail('поле "date" не поддерживается: в расписании только серии (repeat)')

  const start_min = parseStart(raw.start, fail)
  const duration_min = parseDuration(raw.duration, fail)
  const color = parseColor(raw.color, fail)
  const icon = parseIcon(raw.icon, title, fail)
  const note = raw.note == null ? '' : typeof raw.note === 'string' ? raw.note : (fail('заметка должна быть строкой'), '')
  const remind_min_before = parseRemind(raw.remind, fail)
  const weekdays = parseRepeat(raw.repeat, fail)
  const start_date = parseDateField(raw.from, 'from', fail)
  const end_date = parseDateField(raw.until, 'until', fail)
  if (start_date && end_date && end_date < start_date) fail(`"until" (${end_date}) раньше "from" (${start_date})`)
  if (errors.length) return { errors }
  return { task: { key, title, note, color, icon, start_min, duration_min, weekdays, start_date, end_date, remind_min_before } }
}

function parseStart(v, fail) {
  if (v == null || v === '') return null
  const m = typeof v === 'string' ? /^(\d{1,2}):(\d{2})$/.exec(v.trim()) : null
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return fail(`неверное время ${quote(v)}`), null
  return Number(m[1]) * 60 + Number(m[2])
}

function parseDuration(v, fail) {
  if (v == null) return 60
  if (typeof v === 'number' && Number.isInteger(v) && v > 0) return v
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase()
    if (/^\d+$/.test(s) && Number(s) > 0) return Number(s)
    const m = /^(?:(\d+)\s*(?:h|ч))?\s*(?:(\d+)\s*(?:m|min|м|мин))?$/.exec(s)
    const total = m && s && (m[1] || m[2]) ? Number(m[1] ?? 0) * 60 + Number(m[2] ?? 0) : 0
    if (total > 0) return total
  }
  return fail(`неверная длительность ${quote(v)}`), 60
}

function parseColor(v, fail) {
  if (v == null) return 1
  if (typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 8) return v
  const named = typeof v === 'string' ? COLOR_NAMES[v.trim().toLowerCase()] : undefined
  if (named) return named
  return fail(`неверный цвет ${quote(v)} (1..8 или ${Object.keys(COLOR_NAMES).join(', ')})`), 1
}

function parseIcon(v, title, fail) {
  if (v == null) return SUGGEST.find(([re]) => re.test(title))?.[1] ?? 'star'
  if (typeof v === 'string' && ICON_NAMES.includes(v)) return v
  return fail(`неизвестная иконка ${quote(v)}`), 'star'
}

function parseRemind(v, fail) {
  if (v == null) return null
  if (typeof v === 'number' && Number.isInteger(v) && v >= 0) return v
  return fail(`неверное напоминание ${quote(v)} (минуты до начала)`), null
}

function parseDateField(v, field, fail) {
  if (v == null || v === '') return null
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const d = new Date(`${v}T00:00:00Z`)
    if (!Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v) return v
  }
  return fail(`неверная дата в "${field}": ${quote(v)} (ожидается ГГГГ-ММ-ДД)`), null
}

function parseRepeat(v, fail) {
  if (v == null) return fail('нужен "repeat": серия без дней недели невозможна'), null
  const days = new Set()
  for (const part of Array.isArray(v) ? v : [v]) {
    const k = typeof part === 'string' ? part.trim().toLowerCase() : ''
    if (WEEKDAY_ALIASES[k]) WEEKDAY_ALIASES[k].forEach((d) => days.add(d))
    else if (WEEKDAY_NAMES[k]) days.add(WEEKDAY_NAMES[k])
    else fail(`неверный день недели ${quote(part)}`)
  }
  if (days.size === 0) return fail('"repeat" не содержит дней недели'), null
  return [...days].sort((a, b) => a - b)
}

function parseFile(text) {
  let json
  try {
    json = JSON.parse(text)
  } catch {
    return { errors: ['Не удалось разобрать JSON'] }
  }
  const items = Array.isArray(json) ? json : isRecord(json) && Array.isArray(json.tasks) ? json.tasks : null
  if (!items) return { errors: ['Ожидается объект с полем "tasks" или массив задач'] }
  if (items.length === 0) return { errors: ['Список задач пуст'] }
  const tasks = []
  const errors = []
  items.forEach((item, i) => {
    const r = parseTask(item, i + 1)
    if (r.task) tasks.push(r.task)
    else errors.push(...r.errors)
  })
  const seen = new Set()
  for (const t of tasks) {
    if (seen.has(t.key)) errors.push(`Ключ "${t.key}" встречается дважды`)
    seen.add(t.key)
  }
  return errors.length ? { errors } : { tasks }
}

async function resolveToken() {
  if (process.env.SUPABASE_ACCESS_TOKEN) return process.env.SUPABASE_ACCESS_TOKEN
  try {
    return (await readFile(join(homedir(), '.supabase', 'access-token'), 'utf8')).trim()
  } catch {}
  try {
    return execFileSync('security', ['find-generic-password', '-s', 'Supabase CLI', '-a', 'supabase', '-w'], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {}
  throw new Error('Нет токена: задай SUPABASE_ACCESS_TOKEN или выполни `npx supabase login`')
}

async function query(token, sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'dayline-schedule/1.0' },
    body: JSON.stringify({ query: sql }),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`Management API ${res.status}: ${text.slice(0, 500)}`)
  return text ? JSON.parse(text) : []
}

function lit(v) {
  if (v == null) return 'null'
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  if (Array.isArray(v)) return `'{${v.join(',')}}'::smallint[]`
  return `'${String(v).replace(/'/g, "''")}'`
}

const sameDays = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
const today = () => new Date().toLocaleDateString('sv-SE')

function diff(task, row) {
  return FIELDS.filter((f) => {
    if (f === 'weekdays') return !sameDays(task.weekdays, row.weekdays)
    if (f === 'start_date' && task.start_date == null) return false
    return (task[f] ?? null) !== (row[f] ?? null)
  })
}

function setClause(task, extra = '') {
  const parts = FIELDS.filter((f) => f !== 'start_date' || task.start_date != null).map((f) => `${f} = ${lit(task[f])}`)
  return `set ${parts.join(', ')}, updated_at = now()${extra}`
}

function plan(tasks, rows) {
  const keyed = new Map(rows.filter((r) => r.source_key).map((r) => [r.source_key, r]))
  const free = rows.filter((r) => !r.source_key)
  const ops = []
  for (const t of tasks) {
    const existing = keyed.get(t.key)
    if (existing) {
      const changed = diff(t, existing)
      ops.push({ op: changed.length ? 'update' : 'same', task: t, row: existing, changed })
      continue
    }
    const i = free.findIndex((r) => r.title === t.title && sameDays(r.weekdays, t.weekdays))
    if (i >= 0) ops.push({ op: 'adopt', task: t, row: free.splice(i, 1)[0] })
    else ops.push({ op: 'create', task: t })
  }
  const inFile = new Set(tasks.map((t) => t.key))
  for (const r of keyed.values()) if (!inFile.has(r.source_key)) ops.push({ op: 'delete', row: r })
  return ops
}

function toSql(userId, ops) {
  const stmts = ['begin;']
  for (const o of ops) {
    if (o.op === 'update' || o.op === 'adopt') {
      const extra = o.op === 'adopt' ? `, source_key = ${lit(o.task.key)}` : ''
      stmts.push(`update public.tasks ${setClause(o.task, extra)} where id = ${lit(o.row.id)} and user_id = ${lit(userId)};`)
    } else if (o.op === 'create') {
      const t = { ...o.task, start_date: o.task.start_date ?? today() }
      const cols = ['id', 'user_id', 'kind', 'date', 'done', 'source_key', ...FIELDS, 'updated_at']
      const vals = ['gen_random_uuid()', lit(userId), lit('series'), 'null', 'false', lit(t.key), ...FIELDS.map((f) => lit(t[f])), 'now()']
      stmts.push(`insert into public.tasks (${cols.join(', ')}) values (${vals.join(', ')});`)
    } else if (o.op === 'delete') {
      stmts.push(`update public.tasks set deleted_at = now(), updated_at = now() where id = ${lit(o.row.id)} and user_id = ${lit(userId)};`)
    }
  }
  stmts.push('commit;')
  return stmts.join('\n')
}

function report(ops) {
  const label = { create: 'CREATE', update: 'UPDATE', adopt: 'ADOPT ', delete: 'DELETE', same: 'same  ' }
  for (const o of ops) {
    const key = o.task?.key ?? o.row.source_key
    const detail = o.op === 'update' ? ` (${o.changed.join(', ')})` : o.op === 'adopt' ? ` <- id ${o.row.id}` : ''
    if (o.op !== 'same') console.log(`  ${label[o.op]}  ${key}  «${(o.task ?? o.row).title}»${detail}`)
  }
  const count = (op) => ops.filter((o) => o.op === op).length
  console.log(`\ncreated: ${count('create')}  updated: ${count('update')}  adopted: ${count('adopt')}  deleted: ${count('delete')}  unchanged: ${count('same')}`)
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const file = args.find((a) => !a.startsWith('--')) ?? DEFAULT_FILE
  const parsed = parseFile(await readFile(file, 'utf8'))
  if (parsed.errors) {
    console.error(parsed.errors.join('\n'))
    process.exit(1)
  }
  const token = await resolveToken()
  const users = await query(token, `select id from auth.users where email = ${lit(EMAIL)}`)
  if (users.length !== 1) throw new Error(`Пользователь ${EMAIL} не найден`)
  const userId = users[0].id
  const rows = await query(
    token,
    `select id, source_key, ${FIELDS.join(', ')} from public.tasks where user_id = ${lit(userId)} and kind = 'series' and deleted_at is null order by start_min`,
  )
  const ops = plan(parsed.tasks, rows)
  console.log(`${dryRun ? '[dry-run] ' : ''}${file}\n${parsed.tasks.length} задач в файле, ${rows.length} активных серий в базе\n`)
  report(ops)
  if (dryRun || ops.every((o) => o.op === 'same')) return
  await query(token, toSql(userId, ops))
  console.log('applied')
}

main().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
