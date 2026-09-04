import { expect, test, type Page } from '@playwright/test'

const pad = (n: number) => String(n).padStart(2, '0')
const hhmm = (min: number) => `${pad(Math.floor(min / 60) % 24)}:${pad(min % 60)}`

async function createTask(page: Page, title: string, time?: string, durationLabel?: string, note?: string) {
  await page.getByRole('button', { name: 'Новая задача' }).click()
  await page.getByLabel('Название').fill(title)
  if (time) await page.locator('input[type=time]').first().fill(time)
  if (durationLabel) await page.getByRole('radio', { name: durationLabel }).click()
  if (note) await page.getByLabel('Заметка').fill(note)
  await page.getByRole('button', { name: 'Сохранить' }).click()
}

const panel = (page: Page) => page.getByTestId('day-panel')

type TouchType = 'touchstart' | 'touchmove' | 'touchend'

// Playwright builds TouchEvents natively, so this also works in WebKit where `new Touch` is an illegal constructor
async function touchTrack(page: Page, type: TouchType, x: number, y: number) {
  const point = { identifier: 1, clientX: x, clientY: y, pageX: x, pageY: y }
  const list = type === 'touchend' ? [] : [point]
  await page.getByTestId('day-track').dispatchEvent(type, { touches: list, targetTouches: list, changedTouches: [point], bubbles: true, cancelable: true })
}

async function swipeDay(page: Page, dx: number) {
  const step = Math.sign(dx) * 12
  await touchTrack(page, 'touchstart', 200, 400)
  await touchTrack(page, 'touchmove', 200 + step, 401)
  await touchTrack(page, 'touchmove', 200 + dx, 402)
  await touchTrack(page, 'touchend', 200 + dx, 402)
}

const DENSE_DAY = JSON.stringify({
  version: 1,
  tasks: [
    { title: 'Подъём и вода', icon: 'sun', start: '07:00', duration: 15, color: 'yellow', repeat: 'daily', from: '2026-01-01' },
    { title: 'Зарядка', icon: 'dumbbell', start: '07:15', duration: 30, color: 'green', repeat: 'daily', from: '2026-01-01', note: 'Спина, плечи, 20 приседаний' },
    { title: 'Завтрак', icon: 'bowl', start: '07:45', duration: 30, color: 'orange', repeat: 'daily', from: '2026-01-01' },
    { title: 'Anki', icon: 'cards', start: '08:15', duration: 30, color: 'green', repeat: 'daily', from: '2026-01-01', note: 'Польский: 40 новых карточек' },
    { title: 'Чтение', icon: 'book', start: '08:45', duration: 30, color: 'purple', repeat: 'daily', from: '2026-01-01' },
    { title: 'Дорога / настройка дня', icon: 'pen', start: '09:15', duration: 15, color: 'blue', repeat: 'daily', from: '2026-01-01' },
    { title: 'Работа', icon: 'briefcase', start: '09:30', duration: '7h 30m', color: 'blue', repeat: 'daily', from: '2026-01-01', note: 'Стендап в 10:00, ревью PR после обеда, синк с продуктом в 15:00' },
    { title: 'Прогулка', icon: 'run', start: '17:00', duration: 30, color: 'teal', repeat: 'daily', from: '2026-01-01' },
    { title: 'italki: урок английского', icon: 'globe', start: '17:30', duration: 45, color: 'pink', repeat: 'daily', from: '2026-01-01', note: 'Тема: собеседования, подготовить 3 вопроса' },
    { title: 'Логистика переезда', icon: 'box', start: '18:15', duration: 45, color: 'blue', repeat: 'daily', from: '2026-01-01', note: 'PESEL, банк, договор аренды' },
    { title: 'Ужин', icon: 'bowl', start: '19:00', duration: 45, color: 'orange', repeat: 'daily', from: '2026-01-01' },
    { title: 'Side-проект', icon: 'code', start: '19:45', duration: '1h 15m', color: 'purple', repeat: 'daily', from: '2026-01-01', note: 'Dayline: свайп по дню, секции' },
    { title: 'Звонок семье', icon: 'phone', start: '21:00', duration: 20, color: 'red', repeat: 'daily', from: '2026-01-01' },
    { title: 'Аутрич / письма', icon: 'mail', start: '21:20', duration: 25, color: 'teal', repeat: 'daily', from: '2026-01-01' },
    { title: 'Обзор дня', icon: 'pen', start: '21:45', duration: 15, color: 'orange', repeat: 'daily', from: '2026-01-01', note: 'Три строки в дневник' },
    { title: 'Подкаст / музыка', icon: 'music', start: '22:00', duration: 30, color: 'pink', repeat: 'daily', from: '2026-01-01' },
    { title: 'Уборка 10 минут', icon: 'home', start: '22:30', duration: 10, color: 'yellow', repeat: 'daily', from: '2026-01-01' },
    { title: 'Чай без экрана', icon: 'coffee', start: '22:40', duration: 20, color: 'green', repeat: 'daily', from: '2026-01-01' },
    { title: 'Сон', icon: 'moon', start: '23:00', duration: 15, color: 'purple', repeat: 'daily', from: '2026-01-01', note: 'Телефон в другую комнату' },
    { title: 'Позвонить в банк', icon: 'phone', color: 'blue', date: new Date().toISOString().slice(0, 10), note: 'Уточнить лимит на перевод' },
  ],
})

async function importDenseDay(page: Page) {
  await page.goto('/settings')
  await page.getByLabel('JSON для импорта').fill(DENSE_DAY)
  await page.getByRole('button', { name: 'Импортировать' }).click()
  await expect(page.getByText(/Импортировано 20/)).toBeVisible()
  // record whether the empty-state text ever hits the DOM while Dexie is still loading
  await page.addInitScript(() => {
    ;(window as unknown as { __sawEmpty: boolean }).__sawEmpty = false
    new MutationObserver(() => {
      if (document.body?.textContent?.includes('День свободен')) (window as unknown as { __sawEmpty: boolean }).__sawEmpty = true
    }).observe(document.documentElement, { childList: true, subtree: true, characterData: true })
  })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Сегодня/ })).toBeVisible()
}

test('create a timed task, see it in the day list, mark it done', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Сегодня/ })).toBeVisible()

  // tomorrow has no «Сейчас» hero, so fixed times are deterministic regardless of the wall clock
  await swipeDay(page, -160)
  await expect(page.getByRole('heading', { name: 'Завтра' })).toBeVisible()
  await createTask(page, 'Раньше', '09:00')
  await createTask(page, 'Anki', '10:00')

  const list = panel(page).getByTestId('day-list')
  const title = list.getByText('Anki')
  await expect(title).toBeVisible()
  await expect(list.getByText('10:00–11:00')).toBeVisible()

  await list.getByRole('button', { name: 'Выполнено' }).nth(1).click()
  await expect(title).toHaveClass(/line-through/)

  await page.reload()
  await expect(page.getByRole('heading', { name: /Сегодня/ })).toBeVisible()
  await swipeDay(page, -160)
  await expect(page.getByRole('heading', { name: 'Завтра' })).toBeVisible()
  await expect(panel(page).getByTestId('day-list').getByText('Anki')).toHaveClass(/line-through/)
})

test('task without time lands under «Без времени»', async ({ page }) => {
  await page.goto('/')
  await createTask(page, 'Позвонить')
  await expect(panel(page).getByText('Без времени', { exact: true })).toBeVisible()
  await expect(panel(page).getByTestId('untimed-list').getByText('Позвонить')).toBeVisible()
})

test('a task running right now becomes the «Сейчас» hero', async ({ page }) => {
  await page.goto('/')
  const start = new Date().getHours() * 60
  await createTask(page, 'Фокус', hhmm(start), '1 ч 30 мин')

  const hero = panel(page).getByTestId('hero')
  await expect(hero.getByText('Сейчас')).toBeVisible()
  await expect(hero.getByText('Фокус')).toBeVisible()
  await expect(hero.getByRole('button', { name: 'Готово' })).toBeVisible()
  await expect(panel(page).getByTestId('day-list')).toHaveCount(0)

  await hero.getByText('Фокус').click()
  await expect(page.getByRole('dialog', { name: 'Задача' })).toBeVisible()
  await expect(page.getByLabel('Название')).toHaveValue('Фокус')
})

test('focus layout screenshot', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'iphone')
  await page.goto('/')
  const hour = new Date().getHours()
  await createTask(page, 'Логистика: PESEL и банк', hhmm(hour * 60), '1 ч 30 мин')
  await createTask(page, 'italki: урок английского', hhmm(((hour + 2) % 24) * 60), '45 мин')
  await createTask(page, 'Ужин', hhmm(((hour + 4) % 24) * 60), '45 мин')
  await createTask(page, 'Позвонить маме')
  await expect(panel(page).getByTestId('hero').getByText('Сейчас')).toBeVisible()
  await expect(panel(page).getByTestId('untimed-list')).toBeVisible()
  await page.screenshot({ path: 'test-results/day-focus.png' })
})

test('swiping the pager slides to the adjacent day and follows the finger', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'iphone')
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Сегодня/ })).toBeVisible()
  const track = page.getByTestId('day-track')
  const width = (await track.boundingBox())!.width

  await touchTrack(page, 'touchstart', 300, 400)
  await touchTrack(page, 'touchmove', 288, 401)
  await touchTrack(page, 'touchmove', 180, 403)
  const mid = await track.evaluate((el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).m41)
  expect(Math.round(mid)).toBe(Math.round(-width - 120))
  await page.screenshot({ path: 'test-results/day-swipe-mid.png' })

  await touchTrack(page, 'touchend', 180, 403)
  await expect(page.getByRole('heading', { name: 'Завтра' })).toBeVisible()
  await expect(panel(page).getByText('Расписание').or(panel(page).getByText('День свободен'))).toBeVisible()
  await expect.poll(() => track.evaluate((el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).m41)).toBe(-width)
  await page.screenshot({ path: 'test-results/day-swipe-after.png' })

  await swipeDay(page, 160)
  await expect(page.getByRole('heading', { name: 'Сегодня' })).toBeVisible()
  await swipeDay(page, 160)
  await expect(page.getByRole('heading', { name: 'Вчера' })).toBeVisible()

  // a short, slow drag snaps back (a fast flick of the same length would legitimately commit)
  await touchTrack(page, 'touchstart', 200, 400)
  await touchTrack(page, 'touchmove', 212, 401)
  await page.waitForTimeout(150)
  await touchTrack(page, 'touchmove', 230, 402)
  await page.waitForTimeout(150)
  await touchTrack(page, 'touchend', 230, 402)
  await page.waitForTimeout(300)
  await expect(page.getByRole('heading', { name: 'Вчера' })).toBeVisible()

  // vertical gesture is a scroll, not a swipe, even when it drifts sideways later
  await touchTrack(page, 'touchstart', 200, 400)
  await touchTrack(page, 'touchmove', 202, 420)
  await touchTrack(page, 'touchmove', 60, 600)
  await touchTrack(page, 'touchend', 60, 600)
  await page.waitForTimeout(300)
  await expect(page.getByRole('heading', { name: 'Вчера' })).toBeVisible()
  expect(await track.evaluate((el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).m41)).toBe(-width)

  await page.getByRole('button', { name: 'Сегодня' }).click()
  await expect(page.getByRole('heading', { name: 'Сегодня' })).toBeVisible()
})

test('the date strip switches adjacent days with a slide and other days directly', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Сегодня/ })).toBeVisible()
  const today = new Date()
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 12)
  const strip = page.getByTestId('date-strip')

  if (await strip.getByLabel(iso(tomorrow)).count()) {
    await strip.getByLabel(iso(tomorrow)).click()
    await expect(page.getByRole('heading', { name: 'Завтра' })).toBeVisible()
    await expect(strip.getByLabel(iso(tomorrow))).toHaveAttribute('aria-pressed', 'true')
  }

  await page.getByRole('button', { name: 'Следующая неделя' }).click()
  await expect(page.getByRole('heading', { name: /Сегодня|Завтра/ })).toHaveCount(0)
  await page.getByRole('button', { name: 'Сегодня' }).click()
  await expect(page.getByRole('heading', { name: 'Сегодня' })).toBeVisible()
})

test('the note shows up as a second line in the row', async ({ page }) => {
  await page.goto('/')
  const hour = new Date().getHours()
  await createTask(page, 'Раньше', hhmm(((hour + 2) % 24) * 60))
  await createTask(page, 'Работа', hhmm(((hour + 3) % 24) * 60), undefined, 'Стендап в 10:00')
  const row = panel(page).getByTestId('day-list').getByTestId('day-row').filter({ hasText: 'Работа' })
  await expect(row.getByTestId('row-note')).toHaveText('Стендап в 10:00')
})

test('dense day: past section collapses, hero and note render in both themes', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'iphone')
  await importDenseDay(page)

  const hour = new Date().getHours()
  if (hour >= 8 && hour < 23) {
    const summary = page.getByRole('button', { name: /раньше · \d+ выполнено/ })
    await expect(summary).toBeVisible()
    await expect(panel(page).getByText('Раньше сегодня')).toBeVisible()
  }
  await expect(panel(page).getByTestId('hero')).toBeVisible()
  await expect(panel(page).getByTestId('untimed-list').getByTestId('row-note')).toHaveText('Уточнить лимит на перевод')
  expect(await page.evaluate(() => (window as unknown as { __sawEmpty: boolean }).__sawEmpty)).toBe(false)

  await page.emulateMedia({ colorScheme: 'dark' })
  await page.screenshot({ path: 'test-results/day-dense-dark.png' })
  await page.emulateMedia({ colorScheme: 'light' })
  await page.screenshot({ path: 'test-results/day-dense-light.png' })

  // finishing the current block promotes the next one: the tinted «Далее» card
  if (hour >= 7 && hour < 23) {
    await panel(page).getByTestId('hero').getByRole('button', { name: 'Готово' }).click()
    await expect(panel(page).getByTestId('hero').getByText(/Далее в/)).toBeVisible()
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.screenshot({ path: 'test-results/day-dense-next-dark.png' })
    await page.emulateMedia({ colorScheme: 'light' })
    await page.screenshot({ path: 'test-results/day-dense-next-light.png' })
  }

  const summary = page.getByRole('button', { name: /раньше · \d+ выполнено/ })
  if (await summary.isVisible()) {
    await summary.click()
    await expect(panel(page).getByTestId('past-list')).toBeVisible()
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.screenshot({ path: 'test-results/day-dense-dark-expanded.png' })
  }

  await swipeDay(page, -120)
  await expect(page.getByRole('heading', { name: 'Завтра' })).toBeVisible()
  await expect(panel(page).getByText('Расписание')).toBeVisible()
  await page.waitForTimeout(300)
  await page.screenshot({ path: 'test-results/day-dense-tomorrow-dark.png' })
})

test('desktop FAB hugs the centered column', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Сегодня/ })).toBeVisible()
  const fab = await page.getByRole('button', { name: 'Новая задача' }).boundingBox()
  expect(fab).not.toBeNull()
  // column is 480px wide centered: right edge at 960px; FAB right edge = 1440 - (720 - 224) = 944
  expect(Math.round(fab!.x + fab!.width)).toBe(944)
  await page.screenshot({ path: 'test-results/day-desktop.png' })
})
