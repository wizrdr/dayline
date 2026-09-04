import { expect, test } from '@playwright/test'

test('design showcase renders in both themes', async ({ page }) => {
  await page.goto('/design')
  await expect(page.getByText('Button', { exact: false }).first()).toBeVisible()
  await page.getByRole('button', { name: 'Тёмная' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.screenshot({ path: 'test-results/design-dark.png', fullPage: true })
})

test('app shell shows login or setup notice without session', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText(/ссылку для входа|VITE_SUPABASE_URL/i)).toBeVisible()
  await page.screenshot({ path: 'test-results/entry.png' })
})
