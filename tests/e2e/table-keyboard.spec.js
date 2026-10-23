const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { checkScrollableTable, checkFittingTable, checkTableResize } = require('../table-keyboard');

for (const url of ['/author/roadside-archivist/', '/category/field-notes/', '/2026/06/', '/2026/06/21/the-apostrophe-after-the-tag/']) {
  test(`keyboard scrolls overflowing table: ${url}`, async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 851 });
    await checkScrollableTable(page, url);
    const { violations } = await new AxeBuilder({ page }).withRules(['scrollable-region-focusable']).analyze();
    expect(violations).toEqual([]);
  });
}

test('fitting tables add no tab stop', async ({ page }) => {
  await checkFittingTable(page);
});

test('table tab stop follows real overflow after resizing', async ({ page }) => {
  await checkTableResize(page);
});

test('inserted tables are enhanced without changing an authored tabindex', async ({ page }) => {
  await page.goto('/2026/06/21/the-apostrophe-after-the-tag/');
  await page.locator('.wp-block-table').first().evaluate((e) => {
    const clone = e.cloneNode(true);
    clone.id = 'inserted-table';
    clone.removeAttribute('tabindex');
    e.after(clone);
    const authored = e.cloneNode(true);
    authored.id = 'authored-table';
    authored.removeAttribute('data-dirtbag-table-focus');
    authored.setAttribute('tabindex', '-1');
    clone.after(authored);
  });
  await page.setViewportSize({ width: 393, height: 851 });
  await expect(page.locator('#inserted-table')).toHaveAttribute('tabindex', '0');
  await expect(page.locator('#authored-table')).toHaveAttribute('tabindex', '-1');
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('table keeps its keyboard scrolling fallback', async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 851 });
    await checkScrollableTable(page, '/2026/06/21/the-apostrophe-after-the-tag/');
  });
});
