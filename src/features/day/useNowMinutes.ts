import { useEffect, useState } from 'react'
import { minutesNow } from '@/domain/dates'

const TICK_MS = 30_000

export function useNowMinutes(): number {
  const [now, setNow] = useState(minutesNow)
  useEffect(() => {
    const id = window.setInterval(() => setNow(minutesNow()), TICK_MS)
    return () => window.clearInterval(id)
  }, [])
  return now
}
