import { expect, test, type Page } from '@playwright/test'

const pad = (n: number) => String(n).padStart(2, '0')
const hhmm = (min: number) => `${pad(Math.floor(min / 60) % 24)}:${pad(min % 60)}`

async function createTask(page: Page, title: string, time?: string, durationLabel?: string) {
  await page.getByRole('button', { name: 'Новая задача' }).click()
  await page.getByLabel('Название').fill(title)
  if (time) await page.locator('input[type=time]').first().fill(time)
  if (durationLabel) await page.getByRole('radio', { name: durationLabel }).click()
  await page.getByRole('button', { name: 'Сохранить' }).click()
}

test('create a timed task, see it in the day list, mark it done', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Сегодня/ })).toBeVisible()

  // the earlier task takes the hero slot, so «Anki» always lands in the list
  const hour = new Date().getHours()
  await createTask(page, 'Раньше', hhmm(((hour + 2) % 24) * 60))
  const start = ((hour + 3) % 24) * 60
  await createTask(page, 'Anki', hhmm(start))

  const list = page.getByTestId('day-list')
  const title = list.getByText('Anki')
  await expect(title).toBeVisible()
  await expect(list.getByText(`${hhmm(start)}–${hhmm(start + 60)}`)).toBeVisible()

  await list.getByRole('button', { name: 'Выполнено' }).click()
  await expect(title).toHaveClass(/line-through/)

  await page.reload()
  await expect(page.getByTestId('day-list').getByText('Anki')).toHaveClass(/line-through/)
})

test('task without time lands under «Без времени»', async ({ page }) => {
  await page.goto('/')
  await createTask(page, 'Позвонить')
  await expect(page.getByText('Без времени', { exact: true })).toBeVisible()
  await expect(page.getByTestId('untimed-list').getByText('Позвонить')).toBeVisible()
})

test('a task running right now becomes the «Сейчас» hero', async ({ page }) => {
  await page.goto('/')
  const start = new Date().getHours() * 60
  await createTask(page, 'Фокус', hhmm(start), '1 ч 30 мин')

  const hero = page.getByTestId('hero')
  await expect(hero.getByText('Сейчас')).toBeVisible()
  await expect(hero.getByText('Фокус')).toBeVisible()
  await expect(hero.getByRole('button', { name: 'Готово' })).toBeVisible()
  await expect(page.getByTestId('day-list')).toHaveCount(0)
})

test('focus layout screenshot', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'iphone')
  await page.goto('/')
  const hour = new Date().getHours()
  await createTask(page, 'Логистика: PESEL и банк', hhmm(hour * 60), '1 ч 30 мин')
  await createTask(page, 'italki: урок английского', hhmm(((hour + 2) % 24) * 60), '45 мин')
  await createTask(page, 'Ужин', hhmm(((hour + 4) % 24) * 60), '45 мин')
  await createTask(page, 'Позвонить маме')
  await expect(page.getByTestId('hero').getByText('Сейчас')).toBeVisible()
  await expect(page.getByTestId('untimed-list')).toBeVisible()
  await page.screenshot({ path: 'test-results/day-focus.png' })
})
