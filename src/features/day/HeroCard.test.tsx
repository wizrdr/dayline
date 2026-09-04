import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { mkTask } from '@/domain/fixtures'
import type { DayItem, Task } from '@/domain/types'
import { HeroCard } from './HeroCard'
import { heroItem, heroState } from './heroState'

const DATE = '2026-09-04'

function item(patch: Partial<Task>): DayItem {
  const task = mkTask({ icon: null, date: DATE, ...patch })
  return { key: task.id, task, override: null, date: DATE, start_min: task.start_min, duration_min: task.duration_min, done: task.done }
}

const noop = () => {}
const renderState = (items: DayItem[], isToday: boolean, now: number, handlers = {}) => {
  const state = heroState(items, isToday, now)
  render(<HeroCard state={state} onOpen={noop} onDone={noop} onExtend={noop} onStartNow={noop} {...handlers} />)
  return state
}

describe('heroState + HeroCard', () => {
  it('current task: solid card with remaining time, progress and both actions', () => {
    const cur = item({ title: 'Логистика', start_min: 1080, duration_min: 60, color: 2 })
    const onDone = vi.fn()
    const onExtend = vi.fn()
    const onOpen = vi.fn()
    const state = renderState([cur, item({ start_min: 1200 })], true, 1100, { onDone, onExtend, onOpen })

    expect(state).toMatchObject({ kind: 'current', remaining: 40 })
    expect(heroItem(state)?.key).toBe(cur.key)
    expect(screen.getByText('Сейчас')).toBeInTheDocument()
    expect(screen.getByText('ещё 40 мин')).toBeInTheDocument()
    expect(screen.getByText('18:00–19:00')).toBeInTheDocument()
    expect(screen.getByTestId('hero')).toHaveClass('bg-task-2', 'text-on-color')
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '33')

    fireEvent.click(screen.getByRole('button', { name: 'Готово' }))
    fireEvent.click(screen.getByRole('button', { name: '+15 мин' }))
    expect(onDone).toHaveBeenCalledWith(cur)
    expect(onExtend).toHaveBeenCalledWith(cur)
    fireEvent.click(screen.getByText('Логистика'))
    expect(onOpen).toHaveBeenCalledWith(cur)
  })

  it('next task: neutral card with countdown and «Начать сейчас»', () => {
    const next = item({ title: 'Ужин', start_min: 1230, duration_min: 45 })
    const onStartNow = vi.fn()
    const onDone = vi.fn()
    const onOpen = vi.fn()
    const state = renderState([item({ start_min: 540, done: true }), next], true, 1140, { onStartNow, onDone, onOpen })

    expect(state).toMatchObject({ kind: 'next', inMin: 90 })
    expect(screen.getByText('Далее в 20:30')).toBeInTheDocument()
    expect(screen.getByText('через 1 ч 30 мин')).toBeInTheDocument()
    expect(screen.getByTestId('hero')).toHaveClass('bg-task-1-soft', 'border-task-1/30')
    expect(screen.getByTestId('hero')).not.toHaveClass('bg-surface')
    fireEvent.click(screen.getByRole('button', { name: 'Начать сейчас' }))
    expect(onStartNow).toHaveBeenCalledWith(next)
    fireEvent.click(screen.getByRole('button', { name: 'Готово' }))
    expect(onDone).toHaveBeenCalledWith(next)
    fireEvent.click(screen.getByText('Ужин'))
    expect(onOpen).toHaveBeenCalledWith(next)
  })

  it('all done: quiet card with counts, tinted with the accent soft color', () => {
    const state = renderState([item({ start_min: 540, done: true }), item({ start_min: 600, done: true })], true, 1300)
    expect(state.kind).toBe('done')
    expect(screen.getByText('На сегодня всё')).toBeInTheDocument()
    expect(screen.getByText('2 из 2 выполнено')).toBeInTheDocument()
    expect(screen.getByTestId('hero')).toHaveClass('bg-accent-soft', 'border-accent/30')
  })

  it('shows the note under the time range, clamped to two lines', () => {
    const cur = item({ title: 'Работа', start_min: 570, duration_min: 450, note: 'Стендап в 10:00' })
    renderState([cur], true, 600)
    const note = screen.getByTestId('hero-note')
    expect(note).toHaveTextContent('Стендап в 10:00')
    expect(note).toHaveClass('line-clamp-2', 'text-on-color/85')

    cleanup()
    const next = item({ title: 'Ужин', start_min: 1230, note: 'Паста' })
    renderState([next], true, 1200)
    expect(screen.getByTestId('hero-note')).toHaveClass('text-muted')
  })

  it('omits the note element when the note is empty', () => {
    renderState([item({ start_min: 1230, note: '' })], true, 1200)
    expect(screen.queryByTestId('hero-note')).toBeNull()
  })

  it('empty day: «День свободен» with hint', () => {
    expect(renderState([], true, 600).kind).toBe('empty')
    expect(screen.getByText('День свободен')).toBeInTheDocument()
    expect(screen.getByText('Нажмите + чтобы добавить')).toBeInTheDocument()
  })

  it('other day: summary with count and total duration', () => {
    const items = [item({ start_min: 540, duration_min: 60 }), item({ start_min: 600, duration_min: 90 }), item({ duration_min: 30 })]
    const state = renderState(items, false, 570)
    expect(state).toMatchObject({ kind: 'summary', count: 3, totalMin: 180 })
    expect(heroItem(state)).toBeNull()
    expect(screen.getByText('3 дела · 3 ч')).toBeInTheDocument()
  })

  it('other day without tasks: «День свободен» instead of «0 дел»', () => {
    expect(renderState([], false, 600).kind).toBe('empty')
    expect(screen.getByText('День свободен')).toBeInTheDocument()
  })
})
