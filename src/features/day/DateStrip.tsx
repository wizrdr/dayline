import { WEEKDAY_SHORT_RU, addDaysISO, fromISODate, isoWeekday, todayISO, weekDaysAround } from '@/domain/dates'
import type { ISODate } from '@/domain/types'
import { IconButton, cn } from '@/ui'
import { useStripSwipe } from './useStripSwipe'

export interface DateStripProps {
  date: ISODate
  onChange: (date: ISODate) => void
}

export function DateStrip({ date, onChange }: DateStripProps) {
  const today = todayISO()
  const days = weekDaysAround(date)
  const shiftWeek = (weeks: number) => onChange(addDaysISO(date, weeks * 7))
  const swipe = useStripSwipe((dir) => shiftWeek(dir))

  return (
    <div className="flex items-center py-1">
      <IconButton label="Предыдущая неделя" onClick={() => shiftWeek(-1)}>
        <span aria-hidden className="text-xl leading-none">‹</span>
      </IconButton>
      <div data-testid="date-strip" className="flex flex-1 justify-between touch-pan-y" {...swipe}>
        {days.map((d) => {
          const selected = d === date
          const isToday = d === today
          return (
            <button
              key={d}
              type="button"
              aria-pressed={selected}
              aria-label={d}
              onClick={() => onChange(d)}
              className="flex flex-col items-center gap-0.5 py-1"
            >
              <span className="text-[11px] uppercase text-faint">{WEEKDAY_SHORT_RU[isoWeekday(d)]}</span>
              <span
                className={cn(
                  'flex size-9 items-center justify-center rounded-full text-sm font-medium',
                  selected ? 'bg-accent text-accent-fg' : 'text-text',
                )}
              >
                {fromISODate(d).getDate()}
              </span>
              <span
                aria-hidden
                className={cn('size-1 rounded-full', isToday ? (selected ? 'bg-accent' : 'bg-now-line') : 'bg-transparent')}
              />
            </button>
          )
        })}
      </div>
      <IconButton label="Следующая неделя" onClick={() => shiftWeek(1)}>
        <span aria-hidden className="text-xl leading-none">›</span>
      </IconButton>
    </div>
  )
}
