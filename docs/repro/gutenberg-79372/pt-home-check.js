// No-float check: TT5 home page post list, measure linked post titles.
const { chromium } = require('/Users/danknauss/Developer/GitHub/dknauss/dirtbag/tests/node_modules/@playwright/test');
const path = require('path');
const MODE = process.argv[2];
(async () => {
  const browser = await chromium.launch();
  const out = {};
  for (const [label, width] of [['desktop', 1280], ['mobile', 390]]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto('http://localhost:8890/');
    await page.evaluate(() => document.fonts.ready);
    out[label] = await page.$$eval('.wp-block-post-title', (els) => els.filter((h) => h.querySelector('a')).map((h) => {
      const r = h.getBoundingClientRect(); const a = h.querySelector('a');
      return { text: a.textContent.slice(0, 20), display: getComputedStyle(a).display, h: +r.height.toFixed(2), top: +(r.top + scrollY).toFixed(2), lines: a.getClientRects().length };
    }));
    out[label].pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.screenshot({ path: path.join(__dirname, 'pt-results', `${MODE}-home-${label}.png`), fullPage: true });
    await page.close();
  }
  console.log(JSON.stringify(out));
  await browser.close();
})();
