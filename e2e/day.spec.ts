import { expect, test } from '@playwright/test'

test('create a timed task, see it on the timeline, mark it done', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Сегодня/ })).toBeVisible()

  await page.getByRole('button', { name: 'Новая задача' }).click()
  await page.getByLabel('Название').fill('Anki')
  await page.locator('input[type=time]').first().fill('09:00')
  await page.getByRole('button', { name: 'Сохранить' }).click()

  const block = page.getByTestId('timeline').getByText('Anki')
  await expect(block).toBeVisible()
  await expect(page.getByTestId('timeline').getByText('09:00–10:00')).toBeVisible()

  await page.getByRole('button', { name: 'Выполнено' }).first().click()
  await expect(block).toHaveClass(/line-through/)

  await page.reload()
  await expect(page.getByTestId('timeline').getByText('Anki')).toHaveClass(/line-through/)
})

test('task without time lands in the untimed list', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Новая задача' }).click()
  await page.getByLabel('Название').fill('Позвонить')
  await page.getByRole('button', { name: 'Сохранить' }).click()
  await expect(page.getByText('Без времени', { exact: false }).first()).toBeVisible()
  await expect(page.getByText('Позвонить')).toBeVisible()
})
