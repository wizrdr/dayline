import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { addDaysISO } from '@/domain/dates'
import type { ISODate } from '@/domain/types'
import { cn } from '@/ui'
import { REST, type Pager } from './usePager'

interface DayPagerProps {
  date: ISODate
  pager: Pager
  renderDay: (date: ISODate) => ReactNode
}

export function DayPager({ date, pager, renderDay }: DayPagerProps) {
  const dates = [addDaysISO(date, -1), date, addDaysISO(date, 1)]
  return (
    <div className="min-h-0 flex-1 overflow-hidden">
      <div
        ref={(el) => pager.setTrack(el)}
        data-testid="day-track"
        className="flex h-full w-full overscroll-x-none will-change-transform"
        style={{ transform: REST }}
      >
        {dates.map((d, i) => (
          <Panel key={d} current={i === 1}>
            {renderDay(d)}
          </Panel>
        ))}
      </div>
    </div>
  )
}

function Panel({ current, children }: { current: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    if (!current && ref.current) ref.current.scrollTop = 0
  }, [current])
  return (
    <div
      ref={ref}
      data-testid={current ? 'day-panel' : undefined}
      aria-hidden={!current}
      className={cn('h-full w-full shrink-0', current ? 'overflow-y-auto' : 'pointer-events-none overflow-hidden')}
    >
      <div className="mx-auto flex max-w-[480px] flex-col gap-4 px-5 pt-4 pb-[calc(env(safe-area-inset-bottom)+144px)]">{children}</div>
    </div>
  )
}
