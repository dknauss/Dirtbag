// Fail before booting WordPress if an image/package update breaks either engine.
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { chromium, webkit } from '@playwright/test';
import { lockedBrowserEnvironment } from './ci-browser-environment.mjs';

const require = createRequire(import.meta.url);
const { version, image } = lockedBrowserEnvironment();
assert.equal(require('@playwright/test/package.json').version, version, 'Installed Playwright must match the lockfile');
assert.equal(process.env.PLAYWRIGHT_BROWSERS_PATH, '/ms-playwright', 'Use the image’s baked browser directory');
console.log(`Browser environment: ${image}; Playwright ${version}`);
for (const engine of [chromium, webkit]) {
  await access(engine.executablePath());
  const browser = await engine.launch({ timeout: 15_000 });
  try {
    const page = await browser.newPage();
    await page.setContent('<title>Dirtbag browser preflight</title>');
    assert.equal(await page.title(), 'Dirtbag browser preflight');
    console.log(`Verified ${engine.name()} ${browser.version()}: ${engine.executablePath()}`);
  } finally {
    await browser.close();
  }
}
