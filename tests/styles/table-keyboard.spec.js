const { test } = require('@playwright/test');
const { checkScrollableTable, checkFittingTable, checkTableResize } = require('../table-keyboard');

test('overflowing table has visible keyboard focus and scrolls in this style', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 851 });
  await checkScrollableTable(page, '/2026/06/21/the-apostrophe-after-the-tag/');
});

test('table focus adapts to resizing in this style', async ({ page }) => {
  await checkTableResize(page);
});

test('fitting table adds no tab stop in this style', async ({ page }) => {
  await checkFittingTable(page);
});
