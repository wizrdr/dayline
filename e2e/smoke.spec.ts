import { expect, test } from '@playwright/test'

test('design showcase renders in both themes', async ({ page }) => {
  await page.goto('/design')
  await expect(page.getByText('Button', { exact: false }).first()).toBeVisible()
  await page.getByRole('tab', { name: 'Тёмная' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.screenshot({ path: 'test-results/design-dark.png', fullPage: true })
})

test('entry screen renders: day view (dev user), login, or setup notice', async ({ page }) => {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: /Сегодня/ }).or(page.getByRole('button', { name: /^Войти$/ }).or(page.getByText(/VITE_SUPABASE_URL/))),
  ).toBeVisible()
  await page.screenshot({ path: 'test-results/entry.png' })
})
