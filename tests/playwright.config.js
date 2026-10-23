// Playwright config for Dirtbag's e2e + accessibility checks.
// Runs against DIRTBAG_BASE_URL (default: the local WordPress Studio site).
// In CI a WordPress Playground server is booted and the URL is passed in.
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: process.env.DIRTBAG_BASE_URL || 'http://localhost:8887',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 5'] } },
    { name: 'table-webkit', testMatch: /table-keyboard\.spec\.js/, use: { browserName: 'webkit', viewport: { width: 393, height: 851 } } },
  ],
});
