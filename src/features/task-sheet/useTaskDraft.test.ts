import { act, renderHook } from '@testing-library/react'
import { mkTask } from '@/domain/fixtures'
import { diffDraft, draftReducer, initDraftState, useTaskDraft } from './useTaskDraft'

const DATE = '2026-09-04'

describe('draftReducer', () => {
  it('repeat on converts single to series anchored at the draft date', () => {
    const s0 = initDraftState({ task: null, date: DATE })
    const s1 = draftReducer(s0, { type: 'repeat', on: true })
    expect(s1.draft.kind).toBe('series')
    expect(s1.draft.date).toBeNull()
    expect(s1.draft.start_date).toBe(DATE)
    expect(s1.draft.weekdays).toEqual([5])
  })

  it('repeat on without a date anchors at today', () => {
    const s0 = initDraftState({ task: null, date: null })
    const s1 = draftReducer(s0, { type: 'repeat', on: true, today: '2026-09-07' })
    expect(s1.draft.start_date).toBe('2026-09-07')
    expect(s1.draft.weekdays).toEqual([1])
  })

  it('repeat off restores single with the original date', () => {
    const s0 = initDraftState({ task: null, date: DATE })
    const s1 = draftReducer(s0, { type: 'repeat', on: true })
    const s2 = draftReducer(s1, { type: 'set', patch: { weekdays: [1, 3, 5] } })
    const s3 = draftReducer(s2, { type: 'repeat', on: false })
    expect(s3.draft.kind).toBe('single')
    expect(s3.draft.date).toBe(DATE)
    expect(s3.draft.weekdays).toBeNull()
    expect(s3.draft.start_date).toBeNull()
  })

  it('remembers a date edited before toggling repeat', () => {
    const s0 = initDraftState({ task: null, date: DATE })
    const s1 = draftReducer(s0, { type: 'set', patch: { date: '2026-09-10' } })
    const s2 = draftReducer(s1, { type: 'repeat', on: true })
    const s3 = draftReducer(s2, { type: 'repeat', on: false })
    expect(s2.draft.start_date).toBe('2026-09-10')
    expect(s3.draft.date).toBe('2026-09-10')
  })
})

describe('useTaskDraft', () => {
  it('toggles repeat and back through the hook', () => {
    const { result } = renderHook(() => useTaskDraft(null, DATE, true))
    act(() => result.current.setRepeat(true))
    expect(result.current.isRepeat).toBe(true)
    expect(result.current.draft.date).toBeNull()
    act(() => result.current.setRepeat(false))
    expect(result.current.isRepeat).toBe(false)
    expect(result.current.draft.date).toBe(DATE)
  })
})

describe('diffDraft', () => {
  it('returns only changed keys', () => {
    const task = mkTask({ title: 'A', date: DATE, start_min: 540 })
    const { draft } = initDraftState({ task, date: DATE })
    expect(diffDraft(draft, task)).toEqual({})
    expect(diffDraft({ ...draft, title: 'B', start_min: 600 }, task)).toEqual({ title: 'B', start_min: 600 })
  })
})
