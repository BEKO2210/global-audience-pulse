import { defineConfig, devices } from '@playwright/test'

const externalBaseUrl = process.env.E2E_BASE_URL
const projects = [
  {
    name: 'chromium-mobile',
    use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } },
  },
  {
    name: 'chromium-desktop',
    use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
  },
]

if (process.env.E2E_WEBKIT === '1') {
  projects.push({
    name: 'webkit-mobile',
    use: { ...devices['iPhone 15'], viewport: { width: 393, height: 852 } },
  })
}

export default defineConfig({
  testDir: './e2e',
  retries: process.env.CI ? 1 : 0,
  reporter: [['html', { open: 'never' }], ['github']],
  use: {
    baseURL: externalBaseUrl ?? 'http://127.0.0.1:4173/global-audience-pulse/',
    timezoneId: 'Europe/Berlin',
    trace: 'on-first-retry',
  },
  webServer: externalBaseUrl
    ? undefined
    : {
        command: 'npm run preview -- --host 127.0.0.1',
        port: 4173,
        reuseExistingServer: !process.env.CI,
      },
  projects,
})
