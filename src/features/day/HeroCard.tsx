import type { ReactNode } from 'react'
import { formatDuration, formatMin, formatRange } from '@/domain/dates'
import type { DayItem, TaskColor } from '@/domain/types'
import { TaskIcon, cn, taskBgClass, taskSoftBgClass, taskTextClass } from '@/ui'
import type { HeroState } from './heroState'
import { plural } from './plural'

// token utilities with an opacity modifier; kept here because the shared maps only carry solid variants
const taskBorderSoftClass: Record<TaskColor, string> = {
  1: 'border-task-1/30',
  2: 'border-task-2/30',
  3: 'border-task-3/30',
  4: 'border-task-4/30',
  5: 'border-task-5/30',
  6: 'border-task-6/30',
  7: 'border-task-7/30',
  8: 'border-task-8/30',
}

interface HeroCardProps {
  state: HeroState
  onOpen: (item: DayItem) => void
  onDone: (item: DayItem) => void
  onExtend: (item: DayItem) => void
  onStartNow: (item: DayItem) => void
}

export function HeroCard({ state, onOpen, onDone, onExtend, onStartNow }: HeroCardProps) {
  switch (state.kind) {
    case 'current':
      return <CurrentCard state={state} onOpen={onOpen} onDone={onDone} onExtend={onExtend} />
    case 'next':
      return <NextCard state={state} onOpen={onOpen} onDone={onDone} onStartNow={onStartNow} />
    case 'done':
      return <QuietCard title="На сегодня всё" hint={`${state.done} из ${state.total} выполнено`} />
    case 'empty':
      return <QuietCard title="День свободен" hint="Нажмите + чтобы добавить" />
    case 'summary':
      return <QuietCard title={`${plural(state.count, 'дело', 'дела', 'дел')} · ${formatDuration(state.totalMin)}`} />
  }
}

function CurrentCard({
  state,
  onOpen,
  onDone,
  onExtend,
}: {
  state: Extract<HeroState, { kind: 'current' }>
  onOpen: (item: DayItem) => void
  onDone: (item: DayItem) => void
  onExtend: (item: DayItem) => void
}) {
  const { item } = state
  const color = item.task.color
  return (
    <section
      data-testid="hero"
      className={cn('flex flex-col gap-3.5 rounded-lg p-5 text-on-color shadow-card', taskBgClass[color])}
    >
      <Caps left="Сейчас" right={`ещё ${formatDuration(state.remaining)}`} className="opacity-90" />
      <Headline
        item={item}
        onOpen={onOpen}
        tile={
          <div className="flex size-13 shrink-0 items-center justify-center rounded-md bg-on-color/20">
            <TaskIcon name={item.task.icon} size={28} />
          </div>
        }
        subClass="opacity-90"
        noteClass="text-on-color/85"
      />
      <div className="h-1.5 overflow-hidden rounded-full bg-on-color/30" role="progressbar" aria-valuenow={Math.round(state.progress * 100)}>
        <div className="h-full bg-on-color" style={{ width: `${state.progress * 100}%` }} />
      </div>
      <div className="flex gap-2.5">
        <Pill onClick={() => onDone(item)} className={cn('bg-on-color font-bold', taskTextClass[color])}>
          Готово
        </Pill>
        <Pill onClick={() => onExtend(item)} className="bg-on-color/20 font-semibold text-on-color">
          +15 мин
        </Pill>
      </div>
    </section>
  )
}

function NextCard({
  state,
  onOpen,
  onDone,
  onStartNow,
}: {
  state: Extract<HeroState, { kind: 'next' }>
  onOpen: (item: DayItem) => void
  onDone: (item: DayItem) => void
  onStartNow: (item: DayItem) => void
}) {
  const { item } = state
  const color = item.task.color
  return (
    <section
      data-testid="hero"
      className={cn(
        'flex flex-col gap-3.5 rounded-lg border p-5 text-text shadow-card',
        taskSoftBgClass[color],
        taskBorderSoftClass[color],
      )}
    >
      <Caps left={`Далее в ${formatMin(item.start_min ?? 0)}`} right={`через ${formatDuration(state.inMin)}`} className={taskTextClass[color]} />
      <Headline
        item={item}
        onOpen={onOpen}
        tile={
          <div className={cn('flex size-13 shrink-0 items-center justify-center rounded-md', taskBgClass[color], 'text-on-color')}>
            <TaskIcon name={item.task.icon} size={28} />
          </div>
        }
        subClass="text-muted"
        noteClass="text-muted"
      />
      <div className="flex gap-2.5">
        <Pill onClick={() => onStartNow(item)} className="bg-accent font-semibold text-accent-fg">
          Начать сейчас
        </Pill>
        <Pill onClick={() => onDone(item)} className="bg-surface font-semibold text-text">
          Готово
        </Pill>
      </div>
    </section>
  )
}

function QuietCard({ title, hint }: { title: string; hint?: string }) {
  return (
    <section data-testid="hero" className="flex flex-col gap-1 rounded-lg border border-accent/30 bg-accent-soft px-5 py-6 text-center">
      <div className="text-lg font-semibold text-text">{title}</div>
      {hint && <div className="text-sm text-muted">{hint}</div>}
    </section>
  )
}

function Caps({ left, right, className }: { left: string; right: string; className?: string }) {
  return (
    <div className={cn('flex items-center justify-between text-xs font-semibold uppercase tracking-wider', className)}>
      <span>{left}</span>
      <span>{right}</span>
    </div>
  )
}

function Headline({
  item,
  onOpen,
  tile,
  subClass,
  noteClass,
}: {
  item: DayItem
  onOpen: (item: DayItem) => void
  tile: ReactNode
  subClass: string
  noteClass: string
}) {
  const note = item.task.note.trim()
  return (
    <button type="button" onClick={() => onOpen(item)} className="flex items-center gap-3.5 text-left">
      {tile}
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="truncate text-xl font-bold leading-tight tracking-tight">{item.task.title}</div>
        {item.start_min !== null && (
          <div className={cn('text-sm', subClass)}>{formatRange(item.start_min, item.duration_min)}</div>
        )}
        {note && (
          <div data-testid="hero-note" className={cn('line-clamp-2 text-sm leading-snug', noteClass)}>
            {note}
          </div>
        )}
      </div>
    </button>
  )
}

function Pill({ onClick, className, children }: { onClick: () => void; className: string; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'min-h-11 flex-1 rounded-full px-4 text-sm transition-[filter,transform] duration-fast active:scale-[0.98] active:brightness-95',
        className,
      )}
    >
      {children}
    </button>
  )
}
