import type { ReactNode } from 'react'
import { formatDuration, formatMin, formatRange } from '@/domain/dates'
import type { DayItem } from '@/domain/types'
import { TaskIcon, cn, taskBgClass, taskSoftBgClass, taskTextClass } from '@/ui'
import type { HeroState } from './heroState'

interface HeroCardProps {
  state: HeroState
  onDone: (item: DayItem) => void
  onExtend: (item: DayItem) => void
  onStartNow: (item: DayItem) => void
}

export function HeroCard({ state, onDone, onExtend, onStartNow }: HeroCardProps) {
  switch (state.kind) {
    case 'current':
      return <CurrentCard state={state} onDone={onDone} onExtend={onExtend} />
    case 'next':
      return <NextCard state={state} onStartNow={onStartNow} />
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
  onDone,
  onExtend,
}: {
  state: Extract<HeroState, { kind: 'current' }>
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
        tile={
          <div className="flex size-13 shrink-0 items-center justify-center rounded-md bg-on-color/20">
            <TaskIcon name={item.task.icon} size={28} />
          </div>
        }
        subClass="opacity-90"
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
  onStartNow,
}: {
  state: Extract<HeroState, { kind: 'next' }>
  onStartNow: (item: DayItem) => void
}) {
  const { item } = state
  const color = item.task.color
  return (
    <section data-testid="hero" className="flex flex-col gap-3.5 rounded-lg border border-border bg-surface p-5 text-text shadow-card">
      <Caps left={`Далее в ${formatMin(item.start_min ?? 0)}`} right={`через ${formatDuration(state.inMin)}`} className="text-faint" />
      <Headline
        item={item}
        tile={
          <div className={cn('flex size-13 shrink-0 items-center justify-center rounded-md', taskSoftBgClass[color], taskTextClass[color])}>
            <TaskIcon name={item.task.icon} size={28} />
          </div>
        }
        subClass="text-muted"
      />
      <Pill onClick={() => onStartNow(item)} className="bg-accent font-semibold text-accent-fg">
        Начать сейчас
      </Pill>
    </section>
  )
}

function QuietCard({ title, hint }: { title: string; hint?: string }) {
  return (
    <section data-testid="hero" className="flex flex-col gap-1 rounded-lg border border-border bg-surface px-5 py-6 text-center">
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

function Headline({ item, tile, subClass }: { item: DayItem; tile: ReactNode; subClass: string }) {
  return (
    <div className="flex items-center gap-3.5">
      {tile}
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="truncate text-xl font-bold leading-tight tracking-tight">{item.task.title}</div>
        {item.start_min !== null && (
          <div className={cn('text-sm', subClass)}>{formatRange(item.start_min, item.duration_min)}</div>
        )}
      </div>
    </div>
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

function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10
  const m100 = n % 100
  const word = m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20) ? few : many
  return `${n} ${word}`
}
