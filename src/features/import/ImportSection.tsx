import { useMemo, useState } from 'react'
import { createTask, listTasks, softDeleteRow } from '@/db/repo'
import { todayISO } from '@/domain/dates'
import { useSession } from '@/features/auth/session'
import { Button, Textarea, Toggle } from '@/ui'
import { EXAMPLE_JSON, parseImport, type ParseResult } from './schema'

export function ImportSection() {
  const { user } = useSession()
  const [text, setText] = useState('')
  const [replace, setReplace] = useState(false)
  const [busy, setBusy] = useState(false)
  const [imported, setImported] = useState<number | null>(null)
  const [failure, setFailure] = useState<string | null>(null)

  const result = useMemo(() => (text.trim() ? parseImport(text, todayISO()) : null), [text])
  const userId = user?.id ?? null

  const run = async () => {
    if (!result?.ok || !userId) return
    setBusy(true)
    setFailure(null)
    try {
      if (replace) await replaceSeries(result.tasks.filter((t) => t.kind === 'series').map((t) => t.title))
      for (const row of result.tasks) await createTask(row, userId)
      setImported(result.tasks.length)
      setText('')
    } catch (e) {
      setFailure(e instanceof Error ? e.message : 'Не удалось импортировать')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-faint">Вставьте JSON, сгенерированный ассистентом</span>
        <Button variant="soft" size="sm" className="shrink-0" onClick={() => setText(EXAMPLE_JSON)}>
          Показать пример
        </Button>
      </div>
      <Textarea
        aria-label="JSON для импорта"
        rows={8}
        className="font-mono text-sm"
        spellCheck={false}
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setImported(null)
          setFailure(null)
        }}
        placeholder='{ "tasks": [ { "title": "Anki", "start": "09:00", "repeat": "daily" } ] }'
      />
      <Summary result={result} />
      {failure && <span className="text-sm text-danger">{failure}</span>}
      {imported !== null && <span className="text-sm text-text">Импортировано {imported}</span>}
      <Toggle
        label="Заменить существующие серии с тем же названием"
        checked={replace}
        onChange={setReplace}
      />
      <Button disabled={!result?.ok || !userId} loading={busy} onClick={() => void run()}>
        Импортировать
      </Button>
    </div>
  )
}

function Summary({ result }: { result: ParseResult | null }) {
  if (!result) return null
  if (!result.ok) {
    return (
      <ul className="flex flex-col gap-1 text-sm text-danger">
        {result.errors.map((e, i) => (
          <li key={i}>{e}</li>
        ))}
      </ul>
    )
  }
  const series = result.tasks.filter((t) => t.kind === 'series').length
  const singles = result.tasks.length - series
  const parts = [
    series > 0 && plural(series, ['серия', 'серии', 'серий']),
    singles > 0 && plural(singles, ['задача', 'задачи', 'задач']),
  ].filter(Boolean)
  return <span className="text-sm text-text">Будет создано: {parts.join(', ')}</span>
}

async function replaceSeries(titles: string[]) {
  const wanted = new Set(titles.map((t) => t.toLowerCase()))
  const existing = await listTasks()
  for (const t of existing) {
    if (t.kind === 'series' && wanted.has(t.title.toLowerCase())) await softDeleteRow('tasks', t.id)
  }
}

function plural(n: number, [one, few, many]: [string, string, string]): string {
  const mod10 = n % 10
  const mod100 = n % 100
  const word =
    mod10 === 1 && mod100 !== 11 ? one : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? few : many
  return `${n} ${word}`
}

export default ImportSection
