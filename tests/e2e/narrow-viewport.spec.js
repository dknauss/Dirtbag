const { test, expect } = require('@playwright/test');

for (const viewport of [{ width: 240, height: 320 }, { width: 320, height: 240 }, { width: 360, height: 640 }]) {
  test(`post byline fits ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/2026/06/20/we-blamed-the-browser/');
    await expect(page.locator('.byline').first()).toBeVisible();
    for (const author of [null, 'AReallyLongUnbrokenAuthorNameForAConstrainedScreen']) {
      if (author) await page.locator('.byline .wp-block-post-author-name').first().evaluate((el, name) => { el.textContent = name; }, author);
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
    }
  });
}
