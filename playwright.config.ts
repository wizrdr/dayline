import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  use: { baseURL: 'http://localhost:5174' },
  webServer: { command: 'npx vite --mode e2e --port 5174', url: 'http://localhost:5174', reuseExistingServer: true },
  projects: [
    { name: 'iphone', use: { ...devices['iPhone 14'], browserName: 'chromium' } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['iPhone 14'] }, testMatch: /swipe-repeat|day\.spec/ },
  ],
})
