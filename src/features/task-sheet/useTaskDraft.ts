import { useCallback, useEffect, useReducer } from 'react'
import type { NewRow } from '@/db/repo'
import { isoWeekday, todayISO } from '@/domain/dates'
import type { ISODate, Task } from '@/domain/types'

export type TaskDraft = NewRow<Task>

export interface DraftState {
  draft: TaskDraft
  singleDate: ISODate | null
}

export type DraftAction =
  | { type: 'set'; patch: Partial<TaskDraft> }
  | { type: 'repeat'; on: boolean; today?: ISODate }
  | { type: 'reset'; task: Task | null; date: ISODate | null }

export function emptyDraft(date: ISODate | null): TaskDraft {
  return {
    title: '',
    note: '',
    color: 1,
    icon: null,
    date,
    start_min: null,
    duration_min: 60,
    done: false,
    kind: 'single',
    weekdays: null,
    start_date: null,
    end_date: null,
    remind_min_before: null,
  }
}

export function draftFromTask(task: Task): TaskDraft {
  const { id: _id, user_id: _u, updated_at: _at, deleted_at: _del, ...rest } = task
  return rest
}

export function initDraftState(args: { task: Task | null; date: ISODate | null }): DraftState {
  const draft = args.task ? draftFromTask(args.task) : emptyDraft(args.date)
  return { draft, singleDate: draft.kind === 'single' ? draft.date : args.date }
}

export function draftReducer(state: DraftState, action: DraftAction): DraftState {
  switch (action.type) {
    case 'reset':
      return initDraftState(action)
    case 'set': {
      const draft = { ...state.draft, ...action.patch }
      const singleDate = draft.kind === 'single' && 'date' in action.patch ? draft.date : state.singleDate
      return { draft, singleDate }
    }
    case 'repeat':
      return action.on ? toSeries(state, action.today ?? todayISO()) : toSingle(state)
  }
}

function toSeries(state: DraftState, today: ISODate): DraftState {
  if (state.draft.kind === 'series') return state
  const anchor = state.draft.date ?? today
  return {
    singleDate: state.draft.date,
    draft: {
      ...state.draft,
      kind: 'series',
      date: null,
      start_date: anchor,
      end_date: null,
      weekdays: [isoWeekday(anchor)],
    },
  }
}

function toSingle(state: DraftState): DraftState {
  if (state.draft.kind === 'single') return state
  return {
    ...state,
    draft: {
      ...state.draft,
      kind: 'single',
      date: state.singleDate,
      start_date: null,
      end_date: null,
      weekdays: null,
    },
  }
}

export function diffDraft(draft: TaskDraft, task: Task): Partial<Task> {
  const patch: Partial<Task> = {}
  for (const key of Object.keys(draft) as (keyof TaskDraft)[]) {
    if (JSON.stringify(draft[key]) !== JSON.stringify(task[key])) Object.assign(patch, { [key]: draft[key] })
  }
  return patch
}

export function useTaskDraft(task: Task | null, date: ISODate | null, open: boolean) {
  const [state, dispatch] = useReducer(draftReducer, { task, date }, initDraftState)

  useEffect(() => {
    if (open) dispatch({ type: 'reset', task, date })
  }, [open, task, date])

  const set = useCallback((patch: Partial<TaskDraft>) => dispatch({ type: 'set', patch }), [])
  const setRepeat = useCallback((on: boolean) => dispatch({ type: 'repeat', on }), [])

  return { draft: state.draft, set, setRepeat, isRepeat: state.draft.kind === 'series' }
}
