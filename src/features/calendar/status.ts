import { create } from 'zustand'

interface CalendarStatusState {
  errors: Record<string, string>
  setError: (feedId: string, message: string | null) => void
}

export const useCalendarStatus = create<CalendarStatusState>((set) => ({
  errors: {},
  setError: (feedId, message) =>
    set((s) => {
      const errors = { ...s.errors }
      if (message === null) delete errors[feedId]
      else errors[feedId] = message
      return { errors }
    }),
}))
