import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { db } from '@/db/schema'
import { todayISO } from '@/domain/dates'
import { mkTask } from '@/domain/fixtures'
import type { Task } from '@/domain/types'
import { InboxPage } from './InboxPage'

vi.mock('@/features/task-sheet/TaskSheet', () => ({
  TaskSheet: ({ open, task }: { open: boolean; task: Task | null }) =>
    open ? <div data-testid="task-sheet">{task ? `edit:${task.title}` : 'create'}</div> : null,
}))

const USER = 'u1'

function task(overrides: Partial<Task>): Task {
  return mkTask({ id: crypto.randomUUID(), user_id: USER, title: 'Задача', duration_min: 30, ...overrides })
}

describe('InboxPage', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
  })

  it('shows only single tasks without a date that are not done', async () => {
    await db.tasks.bulkPut([
      { ...task({ title: 'Без даты', note: 'заметка' }), _dirty: 0 },
      { ...task({ title: 'С датой', date: '2026-09-04' }), _dirty: 0 },
      { ...task({ title: 'Серия', kind: 'series', weekdays: [1], start_date: '2026-01-01' }), _dirty: 0 },
      { ...task({ title: 'Сделано', done: true }), _dirty: 0 },
    ])
    render(<InboxPage />)
    expect(await screen.findByText('Без даты')).toBeInTheDocument()
    expect(screen.getByText('заметка')).toBeInTheDocument()
    expect(screen.queryByText('С датой')).toBeNull()
    expect(screen.queryByText('Серия')).toBeNull()
    expect(screen.queryByText('Сделано')).toBeNull()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('shows the empty state', async () => {
    render(<InboxPage />)
    expect(await screen.findByText('Пусто. Сюда попадают задачи без даты.')).toBeInTheDocument()
  })

  it('«Сегодня» moves the task to today and removes it from the list', async () => {
    const t = task({ title: 'Перенести' })
    await db.tasks.put({ ...t, _dirty: 0 })
    render(<InboxPage />)
    await screen.findByText('Перенести')
    fireEvent.click(screen.getByRole('button', { name: 'Сегодня' }))
    await waitFor(async () => {
      const row = await db.tasks.get(t.id)
      expect(row?.date).toBe(todayISO())
      expect(row?._dirty).toBe(1)
    })
    await waitFor(() => expect(screen.queryByText('Перенести')).toBeNull())
  })

  it('opens TaskSheet in edit mode on row tap and in create mode from the FAB', async () => {
    await db.tasks.put({ ...task({ title: 'Открыть' }), _dirty: 0 })
    render(<InboxPage />)
    fireEvent.click(await screen.findByText('Открыть'))
    expect(screen.getByTestId('task-sheet')).toHaveTextContent('edit:Открыть')
    fireEvent.click(screen.getByRole('button', { name: 'Новая задача' }))
    expect(screen.getByTestId('task-sheet')).toHaveTextContent('create')
  })
})
