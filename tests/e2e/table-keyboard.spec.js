// Table regions must work on archives and posts using the browser's keyboard scrolling.
const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const fs = require('node:fs');
const path = require('node:path');

const seed = JSON.parse(fs.readFileSync(path.join(__dirname, '../../playground/seed-content.json'), 'utf8'));
const posts = seed.posts.filter((post) => post.post_type === 'post' && post.post_status === 'publish')
  .sort((a, b) => b.post_date.localeCompare(a.post_date));
const tablePost = posts.find((post) => post.post_content.includes('<!-- wp:table'));
const author = seed.users.find((user) => user.user_login === tablePost.author_login);
const [year, month] = tablePost.post_date.split('-');
const PAGES = [
  { kind: 'author archive', url: `/author/${author.user_nicename}/` },
  { kind: 'category archive', url: `/category/${tablePost.terms.category[0]}/` },
  { kind: 'date archive', url: `/${year}/${month}/` },
  { kind: 'post', post: tablePost },
  { kind: 'captioned post', post: posts.find((post) => /<figure class="wp-block-table">[\s\S]*?<figcaption/.test(post.post_content)) },
];

async function visit(page, target) {
  let url = target.url;
  if (target.post) {
    await page.goto('/archive/');
    url = await page.locator(`.wp-block-post-title a[href$="/${target.post.post_name}/"]`).getAttribute('href');
    expect(url, 'the seeded table post must be linked from the archive').toBeTruthy();
  }
  const response = await page.goto(url);
  expect(response.status(), `${target.kind} must render successfully`).toBe(200);
  await expect(page.locator('main .wp-block-table').first()).toBeVisible();
}

async function checkKeyboard(page, figure) {
  expect(await figure.getAttribute('tabindex')).toBe('0');
  // Return through the sequential focus order, rather than proving focus() alone.
  await figure.focus();
  await page.keyboard.press('Shift+Tab');
  await expect(figure).not.toBeFocused();
  await page.keyboard.press('Tab');
  await expect(figure).toBeFocused();
  const focus = await figure.evaluate((el) => {
    const css = getComputedStyle(el);
    return { style: css.outlineStyle, width: parseFloat(css.outlineWidth), color: css.outlineColor };
  });
  expect(focus.style).toBe('solid');
  expect(focus.width).toBeGreaterThanOrEqual(2);
  expect(focus.color).not.toBe('rgba(0, 0, 0, 0)');
  await figure.evaluate((el) => { el.scrollLeft = 0; });
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => figure.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
}

for (const target of PAGES) {
  test(`table region: ${target.kind}`, async ({ page, isMobile }, testInfo) => {
    await visit(page, target);
    const { violations } = await new AxeBuilder({ page })
      .include('main .wp-block-table')
      .withRules(['scrollable-region-focusable'])
      .analyze();
    await testInfo.attach('table-axe.json', {
      body: JSON.stringify(violations, null, 2), contentType: 'application/json',
    });
    expect.soft(violations, `${target.kind}: scrollable table axe findings`).toEqual([]);

    const figures = page.locator('main figure.wp-block-table');
    for (const figure of await figures.all()) {
      expect(await figure.getAttribute('tabindex')).toBe('0');
      await expect(figure).toHaveAttribute('role', 'region');
      const caption = figure.locator('figcaption');
      const label = await caption.count() ? (await caption.innerText()).trim() : 'Scrollable table';
      await expect(figure).toHaveAttribute('aria-label', label);
      expect(await figure.evaluate((el) => getComputedStyle(el).overflowX)).toBe('auto');
    }
    // Non-table figures and ordinary prose acquire no extra tab stops.
    await expect(page.locator('main figure:not(.wp-block-table)[tabindex], main p[tabindex]')).toHaveCount(0);
    const figure = figures.first();
    const overflows = await figure.evaluate((el) => el.scrollWidth > el.clientWidth);
    if (isMobile && target.kind !== 'captioned post') expect(overflows).toBe(true);
    if (overflows) await checkKeyboard(page, figure);
  });
}

test.describe('table with JavaScript disabled', () => {
  test.use({ javaScriptEnabled: false });
  test('keyboard can scroll the post table', async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 851 });
    await visit(page, { kind: 'post', post: tablePost });
    await checkKeyboard(page, page.locator('main figure.wp-block-table').first());
  });
});
