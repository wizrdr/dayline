import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { db } from '@/db/schema'
import { ImportSection } from './ImportSection'
import { EXAMPLE_JSON } from './schema'

vi.mock('@/features/auth/session', () => ({
  useSession: () => ({ session: null, user: { id: 'u1', email: 'me@example.com' }, loading: false }),
}))

const textarea = () => screen.getByRole('textbox', { name: 'JSON для импорта' })
const importButton = () => screen.getByRole('button', { name: 'Импортировать' })

describe('ImportSection', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
  })

  it('imports the example into db.tasks', async () => {
    render(<ImportSection />)
    expect(importButton()).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Показать пример' }))
    expect(textarea()).toHaveValue(EXAMPLE_JSON)
    expect(screen.getByText('Будет создано: 4 серии')).toBeInTheDocument()
    expect(importButton()).toBeEnabled()

    fireEvent.click(importButton())
    expect(await screen.findByText('Импортировано 4')).toBeInTheDocument()
    expect(textarea()).toHaveValue('')

    const rows = await db.tasks.toArray()
    expect(rows).toHaveLength(4)
    expect(rows.every((r) => r.user_id === 'u1' && r.kind === 'series' && r._dirty === 1)).toBe(true)
    expect(rows.find((r) => r.title === 'Anki')).toMatchObject({ start_min: 540, weekdays: [1, 2, 3, 4, 5, 6, 7] })
  })

  it('shows mixed counts and error list', () => {
    render(<ImportSection />)
    fireEvent.change(textarea(), {
      target: {
        value: JSON.stringify([
          { title: 'a', repeat: 'daily' },
          { title: 'b', date: '2026-09-05' },
          { title: 'c' },
        ]),
      },
    })
    expect(screen.getByText('Будет создано: 1 серия, 2 задачи')).toBeInTheDocument()

    fireEvent.change(textarea(), { target: { value: '[{"title": "x", "start": "25:00"}]' } })
    const err = screen.getByText('Задача 1: неверное время "25:00"')
    expect(err.closest('ul')).toHaveClass('text-danger')
    expect(importButton()).toBeDisabled()
  })

  it('replaces existing series with the same title when the toggle is on', async () => {
    const meta = { user_id: 'u1', updated_at: new Date().toISOString(), deleted_at: null, _dirty: 0 as const }
    const base = { note: '', color: 1 as const, icon: null, date: null, start_min: null, duration_min: 60, done: false, remind_min_before: null }
    await db.tasks.bulkPut([
      { ...meta, ...base, id: 's1', title: 'anki', kind: 'series', weekdays: [1], start_date: '2026-01-01', end_date: null },
      { ...meta, ...base, id: 's2', title: 'Другое', kind: 'series', weekdays: [2], start_date: '2026-01-01', end_date: null },
      { ...meta, ...base, id: 't1', title: 'Anki', kind: 'single', weekdays: null, start_date: null, end_date: null },
    ])

    render(<ImportSection />)
    fireEvent.change(textarea(), { target: { value: '[{"title": "Anki", "repeat": "daily"}]' } })
    fireEvent.click(screen.getByRole('switch'))
    fireEvent.click(importButton())
    await screen.findByText('Импортировано 1')

    await waitFor(async () => {
      expect((await db.tasks.get('s1'))?.deleted_at).not.toBeNull()
    })
    expect((await db.tasks.get('s2'))?.deleted_at).toBeNull()
    expect((await db.tasks.get('t1'))?.deleted_at).toBeNull()
    const active = await db.tasks.filter((r) => r.deleted_at === null && r.kind === 'series').toArray()
    expect(active.map((r) => r.title).sort()).toEqual(['Anki', 'Другое'])
  })
})
