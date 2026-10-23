// Playwright config for the per-style accessibility sweep (tests/styles/).
// Kept separate from playwright.config.js so the default `npm test` run does not
// pick it up — these specs require the driver (axe-styles.sh) to apply a variation
// first. Runs against DIRTBAG_BASE_URL (default: the local WordPress Studio site).
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './styles',
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
