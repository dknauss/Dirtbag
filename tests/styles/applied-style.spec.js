// Browser evidence that each matrix leg renders its requested variation.
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const style = process.env.DIRTBAG_STYLE || 'default';
const declaration = JSON.parse(fs.readFileSync(path.join(__dirname, '../..', style === 'default' ? 'theme.json' : `styles/${style}.json`)));
test(`[${style}] rendered body background matches the variation`, async ({ page }) => {
  await page.goto('/');
  const background = declaration.styles?.color?.background;
  if (background) {
    await expect(page.locator('body')).toHaveCSS('background-color', await page.evaluate((color) => {
      const element = document.createElement('span');
      element.style.backgroundColor = color;
      document.body.appendChild(element);
      const value = getComputedStyle(element).backgroundColor;
      element.remove();
      return value;
    }, background));
  } else {
    // No user colour may remain after the explicit terminal -> default reset.
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  }
});
