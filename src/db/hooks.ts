import { useLiveQuery } from 'dexie-react-hooks'
import type { CalendarEvent, IcsFeed, ISODate, Task, TaskOverride } from '../domain/types'
import { listCalendarEvents, listFeeds, listOverrides, listTasks } from './repo'

export function useTasks(): Task[] {
  return useLiveQuery(listTasks, []) ?? []
}

// useLiveQuery yields undefined until Dexie answers; `loaded` lets screens show a skeleton instead of an empty state
export function useTasksState(): { tasks: Task[]; loaded: boolean } {
  const tasks = useLiveQuery(listTasks, [])
  return { tasks: tasks ?? [], loaded: tasks !== undefined }
}

export function useOverrides(): TaskOverride[] {
  return useLiveQuery(listOverrides, []) ?? []
}

export function useFeeds(): IcsFeed[] {
  return useLiveQuery(listFeeds, []) ?? []
}

export function useCalendarEvents(date: ISODate): CalendarEvent[] {
  return useLiveQuery(() => listCalendarEvents(date), [date]) ?? []
}
