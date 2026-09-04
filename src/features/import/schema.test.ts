import { EXAMPLE_JSON, parseImport } from './schema'

const TODAY = '2026-09-04'

function ok(text: string) {
  const res = parseImport(text, TODAY)
  if (!res.ok) throw new Error(res.errors.join('\n'))
  return res.tasks
}

function errors(text: string): string[] {
  const res = parseImport(text, TODAY)
  if (res.ok) throw new Error('expected errors')
  return res.errors
}

describe('parseImport', () => {
  it('parses the example into 4 series', () => {
    const tasks = ok(EXAMPLE_JSON)
    expect(tasks).toHaveLength(4)
    expect(tasks.every((t) => t.kind === 'series' && t.date === null)).toBe(true)
    expect(tasks[0]).toMatchObject({
      title: 'Anki',
      start_min: 540,
      duration_min: 30,
      color: 4,
      weekdays: [1, 2, 3, 4, 5, 6, 7],
      start_date: '2026-09-21',
      end_date: null,
      done: false,
      remind_min_before: null,
    })
    expect(tasks[1]).toMatchObject({ start_min: 1080, duration_min: 60, weekdays: [1, 2, 3, 4], color: 6 })
    expect(tasks[2]).toMatchObject({ start_min: 660, duration_min: 180, weekdays: [6] })
    expect(tasks[3]).toMatchObject({ start_min: 1260, duration_min: 45, weekdays: [7], remind_min_before: 10 })
  })

  it('accepts duration strings', () => {
    const tasks = ok(
      JSON.stringify([
        { title: 'a', duration: '1h' },
        { title: 'b', duration: '1h30m' },
        { title: 'c', duration: '45m' },
        { title: 'd', duration: '90' },
        { title: 'e' },
      ]),
    )
    expect(tasks.map((t) => t.duration_min)).toEqual([60, 90, 45, 90, 60])
  })

  it('accepts color names and numbers', () => {
    const tasks = ok(
      JSON.stringify([
        { title: 'a', color: 'red' },
        { title: 'b', color: 'Pink' },
        { title: 'c', color: 5 },
        { title: 'd' },
      ]),
    )
    expect(tasks.map((t) => t.color)).toEqual([1, 8, 5, 1])
  })

  it('expands repeat aliases and Russian weekdays, sorted and unique', () => {
    const tasks = ok(
      JSON.stringify([
        { title: 'a', repeat: 'daily' },
        { title: 'b', repeat: 'weekdays' },
        { title: 'c', repeat: ['weekends'] },
        { title: 'd', repeat: ['вс', 'пн', 'ср', 'пн'] },
      ]),
    )
    expect(tasks.map((t) => t.weekdays)).toEqual([[1, 2, 3, 4, 5, 6, 7], [1, 2, 3, 4, 5], [6, 7], [1, 3, 7]])
    expect(tasks[0]!.start_date).toBe(TODAY)
  })

  it('accepts a bare array and from/until', () => {
    const tasks = ok(JSON.stringify([{ title: 'x', repeat: ['fri'], from: '2026-10-01', until: '2026-12-31' }]))
    expect(tasks[0]).toMatchObject({ kind: 'series', start_date: '2026-10-01', end_date: '2026-12-31' })
  })

  it('creates a single task on a date', () => {
    const tasks = ok(JSON.stringify({ tasks: [{ title: 'x', date: '2026-09-05', start: '10:15' }] }))
    expect(tasks[0]).toMatchObject({ kind: 'single', date: '2026-09-05', start_min: 615, weekdays: null })
  })

  it('puts tasks without date and repeat into inbox', () => {
    const tasks = ok(JSON.stringify([{ title: 'Купить билеты', note: 'до пятницы' }]))
    expect(tasks[0]).toMatchObject({
      kind: 'single',
      date: null,
      start_min: null,
      duration_min: 60,
      note: 'до пятницы',
      weekdays: null,
    })
  })

  it('reports errors per task', () => {
    const errs = errors(
      JSON.stringify([
        { title: '' },
        { title: 'b', start: '9:00 утра' },
        { title: 'c', repeat: ['mon', 'пон'] },
        { title: 'd', date: '2026-13-40' },
        { title: 'e', duration: 'долго', color: 'brown', remind: -1 },
        { title: 'f', date: '2026-09-05', repeat: 'daily' },
      ]),
    )
    expect(errs).toEqual([
      'Задача 1: не указано название',
      'Задача 2: неверное время "9:00 утра"',
      'Задача 3: неверный день недели "пон"',
      'Задача 4: неверная дата в "date": "2026-13-40" (ожидается ГГГГ-ММ-ДД)',
      'Задача 5: неверная длительность "долго"',
      'Задача 5: неверный цвет "brown" (1..8 или red, orange, yellow, green, teal, blue, purple, pink)',
      'Задача 5: неверное напоминание -1 (минуты до начала, 0 = в момент начала)',
      'Задача 6: укажите либо "date", либо "repeat", но не оба',
    ])
  })

  it('rejects non-JSON and wrong shapes', () => {
    expect(errors('not json')).toEqual(['Не удалось разобрать JSON'])
    expect(errors('{"foo": 1}')).toEqual(['Ожидается объект с полем "tasks" или массив задач'])
    expect(errors('[]')).toEqual(['Список задач пуст'])
    expect(errors('[1]')).toEqual(['Задача 1: ожидается объект'])
  })
})
