import { expect, test, type Page } from '@playwright/test'

type PointerType = 'pointerdown' | 'pointermove' | 'pointerup'

// Playwright builds a real PointerEvent for pointer event names, in WebKit too
async function pointer(page: Page, type: PointerType, x: number, y: number) {
  await page.getByTestId('day-panel').dispatchEvent(type, {
    pointerId: 1,
    pointerType: 'touch',
    isPrimary: true,
    button: 0,
    buttons: type === 'pointerup' ? 0 : 1,
    clientX: x,
    clientY: y,
    bubbles: true,
    cancelable: true,
  })
}

async function swipe(page: Page, dx: number) {
  const s = Math.sign(dx) * 12
  await pointer(page, 'pointerdown', 200, 400)
  await page.waitForTimeout(16)
  await pointer(page, 'pointermove', 200 + s, 401)
  await page.waitForTimeout(16)
  await pointer(page, 'pointermove', 200 + dx, 402)
  await page.waitForTimeout(16)
  await pointer(page, 'pointerup', 200 + dx, 402)
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
