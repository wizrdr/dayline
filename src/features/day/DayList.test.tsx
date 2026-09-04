import { fireEvent, render, screen, within } from '@testing-library/react'
import { mkTask } from '@/domain/fixtures'
import type { CalendarEvent, DayItem, Task } from '@/domain/types'
import { DayList } from './DayList'
import { buildEntries, pastSummary, splitEntries } from './dayEntries'
import { PastSection } from './PastSection'

const DATE = '2026-09-04'

function item(patch: Partial<Task>): DayItem {
  const task = mkTask({ icon: null, date: DATE, ...patch })
  return { key: task.id, task, override: null, date: DATE, start_min: task.start_min, duration_min: task.duration_min, done: task.done }
}

const event: CalendarEvent = { id: 'e1', feed_id: 'f', title: 'Стендап', date: DATE, start_min: 600, duration_min: 30, all_day: false }
const noop = () => {}

function renderList(items: DayItem[], events: CalendarEvent[], heroKey: string | null, label = 'Сегодня', handlers = {}) {
  const entries = buildEntries(items, events, heroKey)
  return render(
    <DayList label={label} entries={entries} allDay={events.filter((e) => e.all_day)} onOpen={noop} onToggleDone={noop} {...handlers} />,
  )
}

describe('DayList', () => {
  it('orders tasks and events by time, excludes the hero item and untimed ones', () => {
    const hero = item({ title: 'Hero', start_min: 720 })
    const items = [
      item({ title: 'Anki', start_min: 540, duration_min: 30 }),
      item({ title: 'Без времени' }),
      hero,
      item({ title: 'Ужин', start_min: 1230, duration_min: 45 }),
    ]
    renderList(items, [event], hero.key, 'Дальше сегодня')

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
    renderList(items, [], null)
    const gaps = screen.getAllByTestId('gap-label').map((el) => el.textContent)
    expect(gaps).toEqual(['1 ч 30 мин свободно'])
  })

  it('measures gaps against the hidden hero item', () => {
    const hero = item({ title: 'Hero', start_min: 1140, duration_min: 90 })
    const items = [item({ start_min: 480, duration_min: 5 }), hero, item({ start_min: 1320, duration_min: 45 })]
    renderList(items, [], hero.key)
    const gaps = screen.getAllByTestId('gap-label').map((el) => el.textContent)
    // 08:05→19:00 belongs to the hidden hero row; 20:30→22:00 is measured from the hero's end
    expect(gaps).toEqual(['1 ч 30 мин свободно'])
    expect(screen.queryByText('Hero')).toBeNull()
  })

  it('renders nothing when only the hero item is timed', () => {
    const hero = item({ title: 'Hero', start_min: 600 })
    const { container } = renderList([hero], [], hero.key)
    expect(container).toBeEmptyDOMElement()
  })

  it('strikes through done items and toggles done via the check control', () => {
    const done = item({ title: 'Готово уже', start_min: 540, done: true })
    const onToggleDone = vi.fn()
    const onOpen = vi.fn()
    renderList([done], [], null, 'Сегодня', { onOpen, onToggleDone })

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
    renderList([], [event], null)
    const row = screen.getByTestId('event-row')
    expect(within(row).getByText('Стендап')).toHaveClass('text-muted')
    expect(within(row).getByText('10:00–10:30')).toBeInTheDocument()
    expect(within(row).queryByRole('button')).toBeNull()
  })

  it('renders nothing when there is nothing to show', () => {
    const { container } = renderList([], [], null)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the note after the time on one truncated sub line', () => {
    renderList([item({ title: 'Работа', start_min: 570, duration_min: 450, note: 'Стендап в 10:00, ревью после обеда' })], [], null)
    const note = screen.getByTestId('row-note')
    expect(note).toHaveTextContent('Стендап в 10:00, ревью после обеда')
    const sub = note.parentElement!
    expect(sub).toHaveClass('truncate', 'text-xs', 'text-faint')
    expect(sub).toHaveTextContent('09:30–17:00 · Стендап в 10:00, ревью после обеда')
  })

  it('omits the note element when the note is empty', () => {
    renderList([item({ start_min: 570, note: '   ' })], [], null)
    expect(screen.queryByTestId('row-note')).toBeNull()
  })
})

describe('splitEntries', () => {
  const finished = item({ title: 'Завтрак', start_min: 420, duration_min: 30, done: true })
  const missed = item({ title: 'Anki', start_min: 480, duration_min: 30 })
  const current = item({ title: 'Работа', start_min: 570, duration_min: 450 })
  const later = item({ title: 'Ужин', start_min: 1140, duration_min: 45 })
  const entries = buildEntries([finished, missed, current, later], [event], current.key)
  const titles = (list: typeof entries) => list.map((e) => (e.kind === 'task' ? e.item.task.title : e.event.title))

  it('puts entries that already ended into past, keeps the hero and the rest in future', () => {
    const { past, future } = splitEntries(entries, 720)
    expect(titles(past)).toEqual(['Завтрак', 'Anki', 'Стендап'])
    expect(titles(future)).toEqual(['Работа', 'Ужин'])
    expect(pastSummary(past)).toEqual({ count: 3, done: 1 })
  })

  it('never moves the hero into the past even if its end has passed', () => {
    const { past, future } = splitEntries(entries, 1500)
    expect(past.some((e) => e.hero)).toBe(false)
    expect(future.filter((e) => e.hero)).toHaveLength(1)
  })

  it('treats another date as all future', () => {
    const { past, future } = splitEntries(entries, null)
    expect(past).toEqual([])
    expect(future).toBe(entries)
  })
})

describe('PastSection', () => {
  const finished = item({ title: 'Завтрак', start_min: 420, duration_min: 30, done: true })
  const missed = item({ title: 'Anki', start_min: 480, duration_min: 30 })
  const past = buildEntries([finished, missed], [], null)

  it('collapses to a single summary row and expands on tap, without gap labels', () => {
    render(<PastSection entries={past} onOpen={noop} onToggleDone={noop} />)
    expect(screen.getByText('Раньше сегодня')).toBeInTheDocument()
    const summary = screen.getByRole('button', { name: '2 дела раньше · 1 выполнено' })
    expect(summary).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Anki')).toBeNull()

    fireEvent.click(summary)
    expect(screen.queryByRole('button', { name: /раньше/ })).toBeNull()
    expect(screen.getByText('Anki')).not.toHaveClass('line-through')
    expect(screen.getByText('Завтрак')).toHaveClass('line-through')
    expect(screen.queryByTestId('gap-label')).toBeNull()
  })

  it('renders nothing without past entries', () => {
    const { container } = render(<PastSection entries={[]} onOpen={noop} onToggleDone={noop} />)
    expect(container).toBeEmptyDOMElement()
  })
})
