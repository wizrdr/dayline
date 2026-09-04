import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { db } from '@/db/schema'
import { TaskSheet } from './TaskSheet'

vi.mock('@/features/auth/session', () => ({
  useSession: () => ({ session: null, user: { id: 'u-test' }, loading: false }),
}))

beforeEach(async () => {
  await db.tasks.clear()
  await db.task_overrides.clear()
})

describe('TaskSheet create', () => {
  it('disables save while the title is empty', () => {
    render(<TaskSheet open onClose={() => {}} task={null} date="2026-09-04" />)
    expect(screen.getByRole('button', { name: 'Сохранить' })).toBeDisabled()
  })

  it('creates a task row with title and date', async () => {
    const onClose = vi.fn()
    render(<TaskSheet open onClose={onClose} task={null} date="2026-09-04" />)
    fireEvent.change(screen.getByLabelText('Название'), { target: { value: 'Купить хлеб' } })
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))

    await waitFor(async () => expect(await db.tasks.count()).toBe(1))
    const [row] = await db.tasks.toArray()
    expect(row).toMatchObject({
      title: 'Купить хлеб',
      date: '2026-09-04',
      user_id: 'u-test',
      kind: 'single',
      start_min: null,
      duration_min: 60,
      color: 1,
    })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('creates a series when repeat is toggled on', async () => {
    render(<TaskSheet open onClose={() => {}} task={null} date="2026-09-04" />)
    fireEvent.change(screen.getByLabelText('Название'), { target: { value: 'Зарядка' } })
    fireEvent.click(screen.getByRole('switch'))
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))

    await waitFor(async () => expect(await db.tasks.count()).toBe(1))
    const [row] = await db.tasks.toArray()
    expect(row).toMatchObject({ kind: 'series', date: null, start_date: '2026-09-04', weekdays: [5] })
  })
})
