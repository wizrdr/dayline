import { fireEvent, render, screen, within } from '@testing-library/react'
import { mkTask } from '@/domain/fixtures'
import type { CalendarEvent, DayItem, Task } from '@/domain/types'
import { DayList } from './DayList'

const DATE = '2026-09-04'

function item(patch: Partial<Task>): DayItem {
  const task = mkTask({ icon: null, date: DATE, ...patch })
  return { key: task.id, task, override: null, date: DATE, start_min: task.start_min, duration_min: task.duration_min, done: task.done }
}

const event: CalendarEvent = { id: 'e1', feed_id: 'f', title: 'Стендап', date: DATE, start_min: 600, duration_min: 30, all_day: false }
const noop = () => {}

describe('DayList', () => {
  it('orders tasks and events by time, excludes the hero item and untimed ones', () => {
    const hero = item({ title: 'Hero', start_min: 720 })
    const items = [
      item({ title: 'Anki', start_min: 540, duration_min: 30 }),
      item({ title: 'Без времени' }),
      hero,
      item({ title: 'Ужин', start_min: 1230, duration_min: 45 }),
    ]
    render(<DayList label="Дальше сегодня" items={items} events={[event]} heroKey={hero.key} onOpen={noop} onToggleDone={noop} />)

    const list = screen.getByTestId('day-list')
    const titles = within(list)
      .getAllByText(/Anki|Стендап|Ужин|Hero|Без времени/)
      .map((el) => el.textContent)
    expect(titles).toEqual(['Anki', 'Стендап', 'Ужин'])
    expect(screen.getByText('Дальше сегодня')).toBeInTheDocument()
    expect(screen.getByText('09:00–09:30')).toBeInTheDocument()
  })

  it('adds a gap label only for free gaps of 60 min or more', () => {
    const items = [
      item({ start_min: 540, duration_min: 30 }),
      item({ start_min: 600, duration_min: 60 }),
      item({ start_min: 750, duration_min: 30 }),
    ]
    render(<DayList label="Сегодня" items={items} events={[]} heroKey={null} onOpen={noop} onToggleDone={noop} />)
    const gaps = screen.getAllByTestId('gap-label').map((el) => el.textContent)
    expect(gaps).toEqual(['1 ч 30 мин свободно'])
  })

  it('strikes through done items and toggles done via the check control', () => {
    const done = item({ title: 'Готово уже', start_min: 540, done: true })
    const onToggleDone = vi.fn()
    const onOpen = vi.fn()
    render(<DayList label="Сегодня" items={[done]} events={[]} heroKey={null} onOpen={onOpen} onToggleDone={onToggleDone} />)

    expect(screen.getByText('Готово уже')).toHaveClass('line-through', 'opacity-55')
    const check = screen.getByRole('button', { name: 'Выполнено' })
    expect(check).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(check)
    expect(onToggleDone).toHaveBeenCalledWith(done)
    expect(onOpen).not.toHaveBeenCalled()

    fireEvent.click(screen.getByText('Готово уже'))
    expect(onOpen).toHaveBeenCalledWith(done)
  })

  it('renders calendar events as non-interactive muted rows', () => {
    render(<DayList label="Сегодня" items={[]} events={[event]} heroKey={null} onOpen={noop} onToggleDone={noop} />)
    const row = screen.getByTestId('event-row')
    expect(within(row).getByText('Стендап')).toHaveClass('text-muted')
    expect(within(row).getByText('10:00–10:30')).toBeInTheDocument()
    expect(within(row).queryByRole('button')).toBeNull()
  })

  it('renders nothing when there is nothing to show', () => {
    const { container } = render(<DayList label="Сегодня" items={[]} events={[]} heroKey={null} onOpen={noop} onToggleDone={noop} />)
    expect(container).toBeEmptyDOMElement()
  })
})
