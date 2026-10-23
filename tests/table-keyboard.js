const { expect } = require('@playwright/test');

// Sentinels isolate the table's place in the real document's tab order. Never
// focus the table directly: that would conceal a missing keyboard entry point.
async function bracketTable(table) {
  await table.evaluate((element) => {
    for (const side of ['before', 'after']) {
      const button = document.createElement('button');
      button.id = `table-${side}`;
      button.textContent = side;
      element[side](button);
    }
    document.querySelector('#table-before').focus();
  });
}

async function checkScrollableTable(page, url) {
  await page.goto(url);
  const table = page.locator('.wp-block-table').first();
  await expect(table).toBeVisible();
  expect(await table.evaluate((e) => e.scrollWidth > e.clientWidth)).toBe(true);
  await bracketTable(table);
  await page.keyboard.press('Tab');
  await expect(table).toBeFocused();
  const focus = await table.evaluate((e) => {
    const style = getComputedStyle(e);
    return { visible: e.matches(':focus-visible'), width: style.outlineWidth,
      style: style.outlineStyle, color: style.outlineColor, text: style.color };
  });
  expect(focus.visible).toBe(true);
  expect(parseFloat(focus.width)).toBeGreaterThanOrEqual(2);
  expect(focus.style).toBe('solid');
  expect(focus.color).toBe(focus.text);
  // Exercise real arrow-key repeats. WebKit can ignore a key dispatched while
  // its native focus/scroll animation is starting; never set scrollLeft in JS.
  await expect.poll(async () => {
    await page.keyboard.press('ArrowRight', { delay: 50 });
    return table.evaluate((e) => e.scrollLeft);
  }, { timeout: 3000 }).toBeGreaterThan(0);
  await expect.poll(async () => {
    await page.keyboard.press('ArrowLeft', { delay: 50 });
    return table.evaluate((e) => e.scrollLeft);
  // WebKit's rubber-band overscroll can briefly report a negative scrollLeft.
  }, { timeout: 3000 }).toBeLessThanOrEqual(0);
  await page.keyboard.press('Tab');
  await expect(page.locator('#table-after')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(table).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('#table-before')).toBeFocused();
}

async function checkFittingTable(page) {
  await page.goto('/2026/06/21/the-apostrophe-after-the-tag/');
  const table = page.locator('.wp-block-table').first();
  // Keep the rendered block wrapper and theme CSS, but use a genuinely small
  // table so this also checks mobile and does not depend on a breakpoint.
  await table.locator('table').evaluate((e) => { e.innerHTML = '<tbody><tr><td>Fits</td></tr></tbody>'; });
  expect(await table.evaluate((e) => e.scrollWidth > e.clientWidth)).toBe(false);
  await expect.poll(() => table.getAttribute('tabindex')).toBeNull();
  await bracketTable(table);
  await page.keyboard.press('Tab');
  await expect(page.locator('#table-after')).toBeFocused();
}

async function checkTableResize(page) {
  await page.setViewportSize({ width: 393, height: 851 });
  await page.goto('/2026/06/21/the-apostrophe-after-the-tag/');
  const table = page.locator('.wp-block-table').first();
  await expect(table).toHaveAttribute('tabindex', '0');
  await page.setViewportSize({ width: 1600, height: 1000 });
  await expect.poll(() => table.evaluate((e) => e.scrollWidth > e.clientWidth)).toBe(false);
  await expect.poll(() => table.getAttribute('tabindex')).toBeNull();
  await bracketTable(table);
  await page.keyboard.press('Tab');
  await expect(page.locator('#table-after')).toBeFocused();
  await page.setViewportSize({ width: 393, height: 851 });
  await expect(table).toHaveAttribute('tabindex', '0');
}

module.exports = { checkScrollableTable, checkFittingTable, checkTableResize };
