import { expect, test, type Page } from '@playwright/test'

type TouchType = 'touchstart' | 'touchmove' | 'touchend'

// Playwright builds a real PointerEvent for pointer event names, in WebKit too
async function pointer(page: Page, type: TouchType, x: number, y: number) {
  const point = { identifier: 1, clientX: x, clientY: y, pageX: x, pageY: y }
  const list = type === 'touchend' ? [] : [point]
  // Playwright builds a native TouchEvent from this init, WebKit included
  await page.getByTestId('day-panel').dispatchEvent(type, { touches: list, targetTouches: list, changedTouches: [point], bubbles: true, cancelable: true })
}

async function swipe(page: Page, dx: number) {
  const s = Math.sign(dx) * 12
  await pointer(page, 'touchstart', 200, 400)
  await page.waitForTimeout(16)
  await pointer(page, 'touchmove', 200 + s, 401)
  await page.waitForTimeout(16)
  await pointer(page, 'touchmove', 200 + dx, 402)
  await page.waitForTimeout(16)
  await pointer(page, 'touchend', 200 + dx, 402)
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

test('bottom arrows switch days back and forth', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Сегодня/ })).toBeVisible()
  await page.getByRole('button', { name: 'Следующий день' }).click()
  await expect(page.getByRole('heading', { name: 'Завтра' })).toBeVisible()
  await page.getByRole('button', { name: 'Следующий день' }).click()
  await expect(page.getByRole('heading', { name: /Сегодня|Завтра/ })).toHaveCount(0)
  await page.getByRole('button', { name: 'Предыдущий день' }).click()
  await page.getByRole('button', { name: 'Предыдущий день' }).click()
  await expect(page.getByRole('heading', { name: /Сегодня/ })).toBeVisible()
})
