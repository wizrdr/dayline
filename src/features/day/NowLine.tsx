import { topPx } from '@/domain/layout'

export function NowLine({ nowMin, gutterPx }: { nowMin: number; gutterPx: number }) {
  return (
    <div
      data-testid="now-line"
      aria-hidden
      className="pointer-events-none absolute right-0 z-10 h-0.5 bg-now-line"
      style={{ top: `${topPx(nowMin)}px`, left: `${gutterPx}px` }}
    >
      <span className="absolute -left-1 -top-[3px] size-2 rounded-full bg-now-line" />
    </div>
  )
}
