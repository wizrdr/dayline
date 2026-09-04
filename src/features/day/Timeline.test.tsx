import { render, screen } from '@testing-library/react'
import { todayISO } from '@/domain/dates'
import type { DayItem, Task } from '@/domain/types'
import { Timeline } from './Timeline'

function task(id: string, patch: Partial<Task> = {}): Task {
  return {
    id,
    user_id: 'u1',
    updated_at: '2026-01-01T00:00:00Z',
    deleted_at: null,
    title: `Задача ${id}`,
    note: '',
    color: 3,
    date: '2026-09-04',
    start_min: 540,
    duration_min: 60,
    done: false,
    kind: 'single',
    weekdays: null,
    start_date: null,
    end_date: null,
    remind_min_before: null,
    ...patch,
  }
}

function item(t: Task): DayItem {
  return {
    key: t.id,
    task: t,
    override: null,
    date: '2026-09-04',
    start_min: t.start_min,
    duration_min: t.duration_min,
    done: t.done,
  }
}

const noop = () => {}

describe('Timeline', () => {
  it('positions overlapping blocks in separate columns', () => {
    const items = [item(task('a', { start_min: 540 })), item(task('b', { start_min: 570 }))]
    render(<Timeline date="2026-09-04" items={items} events={[]} onOpen={noop} onToggleDone={noop} onMove={noop} />)

    const [a, b] = screen.getAllByTestId('task-block')
    expect(a).toHaveStyle({ top: '648px', height: '72px' })
    expect(b).toHaveStyle({ top: '684px', height: '72px' })
    expect(a.style.left).not.toBe(b.style.left)
    expect(a.style.width).toBe('calc(50% - 2px)')
  })

  it('strikes through a done item', () => {
    render(
      <Timeline
        date="2026-09-04"
        items={[item(task('a', { done: true }))]}
        events={[]}
        onOpen={noop}
        onToggleDone={noop}
        onMove={noop}
      />,
    )
    expect(screen.getByText('Задача a')).toHaveClass('line-through')
  })

  it('renders calendar events as ghost blocks and all-day chips', () => {
    render(
      <Timeline
        date="2026-09-04"
        items={[]}
        events={[
          { id: 'e1', feed_id: 'f', title: 'Созвон', date: '2026-09-04', start_min: 600, duration_min: 30, all_day: false },
          { id: 'e2', feed_id: 'f', title: 'Отпуск', date: '2026-09-04', start_min: 0, duration_min: 1440, all_day: true },
        ]}
        onOpen={noop}
        onToggleDone={noop}
        onMove={noop}
      />,
    )
    expect(screen.getByTestId('event-block')).toHaveStyle({ top: '720px' })
    expect(screen.getByText('Отпуск')).toBeInTheDocument()
  })

  it('shows the now line only for today', () => {
    const today = todayISO()
    const { rerender } = render(
      <Timeline date={today} items={[]} events={[]} onOpen={noop} onToggleDone={noop} onMove={noop} />,
    )
    expect(screen.getByTestId('now-line')).toBeInTheDocument()
    rerender(<Timeline date="2000-01-01" items={[]} events={[]} onOpen={noop} onToggleDone={noop} onMove={noop} />)
    expect(screen.queryByTestId('now-line')).toBeNull()
  })
})
