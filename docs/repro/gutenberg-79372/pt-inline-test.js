// Throwaway check for WordPress/gutenberg#79372: Post Title link inline-block vs inline.
// Usage: node pt-inline-test.js <baseline|inline>  (the site option must already match).
const { chromium } = require('/Users/danknauss/Developer/GitHub/dknauss/dirtbag/tests/node_modules/@playwright/test');
const fs = require('fs');
const path = require('path');

const MODE = process.argv[2] || 'baseline';
const BASE = 'http://localhost:8890';
const PAGE_ID = 5;
const OUT = path.join(__dirname, 'pt-results');
fs.mkdirSync(OUT, { recursive: true });

const results = { mode: MODE, tests: {}, console: [] };
const record = (name, data) => { results.tests[name] = data; };

async function run(name, fn) {
  try { record(name, await fn()); }
  catch (e) { record(name, { error: String(e.message || e).split('\n')[0] }); }
}

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) results.console.push(`${m.type()}: ${m.text()}`.slice(0, 300)); });

  await page.goto(`${BASE}/?pt_autologin=1`);

  // Front end: does the title wrap beside the float?
  await run('frontend', async () => {
    await page.goto(`${BASE}/?page_id=${PAGE_ID}`);
    const box = page.locator('.pt-float-test');
    await box.screenshot({ path: path.join(OUT, `${MODE}-frontend.png`) });
    return box.evaluate((el) => {
      const f = el.querySelector('.pt-float').getBoundingClientRect();
      const a = el.querySelector('.wp-block-post-title a');
      const r = a.getClientRects()[0];
      return { display: getComputedStyle(a).display, firstLineBesideFloat: r.left >= f.right - 1 && r.top < f.bottom, lineBoxes: a.getClientRects().length };
    });
  });

  // Editor
  await page.goto(`${BASE}/wp-admin/post.php?post=${PAGE_ID}&action=edit`);
  await page.waitForFunction(() => window.wp && wp.data && wp.data.select('core/editor').getCurrentPostId());
  await page.evaluate(() => {
    const p = wp.data.dispatch('core/preferences');
    p.set('core/edit-post', 'welcomeGuide', false);
    p.set('core', 'welcomeGuide', false);
    // Keep the block toolbar out of the canvas so it can't intercept clicks on the title.
    p.set('core', 'fixedToolbar', true);
  });
  await page.keyboard.press('Escape');
  const frame = page.frameLocator('iframe[name="editor-canvas"]');
  const link = frame.locator('.wp-block-post-title a[contenteditable="true"]');
  await link.waitFor({ timeout: 30000 });
  const title = () => page.evaluate(() => wp.data.select('core/editor').getEditedPostAttribute('title'));
  const state = () => link.evaluate((el) => {
    const doc = el.ownerDocument;
    const sel = doc.getSelection();
    const r = el.getBoundingClientRect();
    return { focused: doc.activeElement === el, caretInside: !!sel.anchorNode && el.contains(sel.anchorNode), width: Math.round(r.width), height: Math.round(r.height) };
  });
  const selectAllDelete = async () => { await link.click(); await page.keyboard.press('ControlOrMeta+a'); await page.keyboard.press('Backspace'); };

  await run('editor-float', async () => {
    await link.scrollIntoViewIfNeeded();
    await frame.locator('.pt-float-test').screenshot({ path: path.join(OUT, `${MODE}-editor.png`) });
    return link.evaluate((el) => {
      const f = el.ownerDocument.querySelector('.pt-float').getBoundingClientRect();
      const r = el.getClientRects()[0];
      return { display: getComputedStyle(el).display, firstLineBesideFloat: r.left >= f.right - 1 && r.top < f.bottom };
    });
  });

  await run('type-at-end', async () => {
    const rects = await link.evaluate((el) => [...el.getClientRects()].map((r) => ({ x: r.right, y: r.top + r.height / 2 })));
    const last = rects[rects.length - 1];
    const box = await link.boundingBox();
    const frameBox = await page.locator('iframe[name="editor-canvas"]').boundingBox();
    await page.mouse.click(frameBox.x + last.x - 1, frameBox.y + last.y);
    await page.keyboard.press('End');
    await page.keyboard.type(' XYZ');
    const t = await title();
    return { ok: t.endsWith(' XYZ'), title: t, clickedInsideBox: !!box };
  });

  await run('select-all-delete', async () => {
    await selectAllDelete();
    const t = await title();
    const s = await state();
    await link.screenshot({ path: path.join(OUT, `${MODE}-editor-empty.png`) }).catch(() => {});
    return { ok: t === '' && s.focused && s.caretInside && s.width > 0, title: t, ...s };
  });

  await run('type-into-empty', async () => {
    await page.keyboard.type('New');
    const t = await title();
    return { ok: t === 'New', title: t };
  });

  await run('backspace-on-empty', async () => {
    await selectAllDelete();
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Backspace');
    const blocks = await page.evaluate(() => {
      const count = (list) => list.reduce((n, b) => n + (b.name === 'core/post-title' ? 1 : 0) + count(b.innerBlocks), 0);
      return count(wp.data.select('core/block-editor').getBlocks());
    });
    const s = await state();
    return { ok: blocks === 1 && (await title()) === '', postTitleBlocks: blocks, ...s };
  });

  await run('refocus-empty-by-click', async () => {
    await frame.locator('.pt-float-test p').click();
    const box = await link.boundingBox();
    if (!box || box.width < 1) return { ok: false, reason: 'empty link has no clickable box', box };
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    const afterClick = await state();
    await page.keyboard.type('Again');
    const t = await title();
    return { ok: t === 'Again', title: t, afterClick, box: { w: Math.round(box.width), h: Math.round(box.height) } };
  });

  await run('caret-at-start-of-wrapped-title', async () => {
    await selectAllDelete();
    await page.keyboard.type('A reasonably long linked post title that should wrap');
    const first = await link.evaluate((el) => { const r = el.getClientRects()[0]; return { x: r.left, y: r.top + r.height / 2, lines: el.getClientRects().length }; });
    const frameBox = await page.locator('iframe[name="editor-canvas"]').boundingBox();
    await page.mouse.click(frameBox.x + first.x + 1, frameBox.y + first.y);
    await page.keyboard.press('Home');
    await page.keyboard.type('Q');
    const t = await title();
    return { ok: t.startsWith('QA reasonably'), title: t, lineBoxes: first.lines };
  });

  fs.writeFileSync(path.join(OUT, `${MODE}.json`), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
  await browser.close();
})();
