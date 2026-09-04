import { createTask } from '@/db/repo'
import { db } from '@/db/schema'
import { materializeDay } from '@/domain/recurrence'
import { moveItem, skipOccurrence, toggleDone } from './actions'

const DATE = '2026-09-04'

beforeEach(async () => {
  await db.tasks.clear()
  await db.task_overrides.clear()
})

async function seriesItem() {
  const task = await createTask(
    {
      title: 'Зарядка',
      note: '',
      color: 2,
      date: null,
      start_min: 480,
      duration_min: 30,
      done: false,
      kind: 'series',
      weekdays: [1, 2, 3, 4, 5, 6, 7],
      start_date: '2026-01-01',
      end_date: null,
      remind_min_before: null,
    },
    'u1',
  )
  const [item] = materializeDay([task], [], DATE)
  return item
}

describe('day actions', () => {
  it('toggle done on a series occurrence creates an override with done=true', async () => {
    const item = await seriesItem()
    await toggleDone(item, [], 'u1')

    const rows = await db.task_overrides.toArray()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ series_id: item.task.id, date: DATE, done: true, skipped: false, user_id: 'u1' })
  })

  it('toggle done again patches the existing override instead of creating a second one', async () => {
    const item = await seriesItem()
    await toggleDone(item, [], 'u1')
    const overrides = await db.task_overrides.toArray()
    const [doneItem] = materializeDay([item.task], overrides, DATE)
    expect(doneItem.done).toBe(true)

    await toggleDone(doneItem, overrides, 'u1')
    const rows = await db.task_overrides.toArray()
    expect(rows).toHaveLength(1)
    expect(rows[0].done).toBe(false)
  })

  it('toggle done on a single task patches the task row', async () => {
    const task = await createTask(
      {
        title: 'Хлеб',
        note: '',
        color: 1,
        date: DATE,
        start_min: null,
        duration_min: 60,
        done: false,
        kind: 'single',
        weekdays: null,
        start_date: null,
        end_date: null,
        remind_min_before: null,
      },
      'u1',
    )
    const [item] = materializeDay([task], [], DATE)
    await toggleDone(item, [], 'u1')
    expect((await db.tasks.get(task.id))?.done).toBe(true)
    expect(await db.task_overrides.count()).toBe(0)
  })

  it('move and skip write start_min / skipped into the override', async () => {
    const item = await seriesItem()
    await moveItem(item, 600, [], 'u1')
    let rows = await db.task_overrides.toArray()
    expect(rows[0]).toMatchObject({ start_min: 600, skipped: false })

    await skipOccurrence(item, rows, 'u1')
    rows = await db.task_overrides.toArray()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ start_min: 600, skipped: true })
    expect(materializeDay([item.task], rows, DATE)).toHaveLength(0)
  })
})
