import { expect, test, type Page } from '@playwright/test'

type TouchType = 'touchstart' | 'touchmove' | 'touchend'

async function touch(page: Page, type: TouchType, x: number, y: number) {
  const point = { identifier: 1, clientX: x, clientY: y, pageX: x, pageY: y }
  const list = type === 'touchend' ? [] : [point]
  // WebKit has no Touch constructor in page scripts; Playwright builds the event natively
  await page.getByTestId('day-panel').dispatchEvent(type, { touches: list, targetTouches: list, changedTouches: [point], bubbles: true, cancelable: true })
}

async function swipe(page: Page, dx: number) {
  const s = Math.sign(dx) * 12
  await touch(page, 'touchstart', 200, 400)
  await page.waitForTimeout(16)
  await touch(page, 'touchmove', 200 + s, 401)
  await page.waitForTimeout(16)
  await touch(page, 'touchmove', 200 + dx, 402)
  await page.waitForTimeout(16)
  await touch(page, 'touchend', 200 + dx, 402)
  await page.waitForTimeout(500)
}

test('three swipes in a row keep switching days, then back', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Сегодня/ })).toBeVisible()
  await swipe(page, -160)
  await expect(page.getByRole('heading', { name: 'Завтра' })).toBeVisible()
  await swipe(page, -160)
  await expect(page.getByRole('heading', { name: /Сегодня|Завтра/ })).toHaveCount(0)
  const third = await page.locator('h1').first().innerText()
  await swipe(page, -160)
  await expect(page.locator('h1').first()).not.toHaveText(third)
  await swipe(page, 160)
  await expect(page.locator('h1').first()).toHaveText(third)
})
