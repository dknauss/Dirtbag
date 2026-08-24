// Per-style print stylesheet — asserts the theme prints as black ink on white
// paper whatever the on-screen variation, drops the chrome that cannot be used
// on paper, and still prints the article.
//
// Why this is per-style rather than a single check in tests/e2e/: the failure
// this guards against is variation-specific. Browsers drop backgrounds when
// printing, so the dark variations (Terminal, Amber CRT, Blueprint) would
// otherwise send near-white text to a blank sheet — a page that looks fine on
// screen and comes out empty. The light variations can't show that regression,
// so the check has to run against each one in turn.
//
// Like a11y-styles.spec.js, this scans whatever variation is currently active;
// the driver (tests/axe-styles.sh) applies each in turn and re-runs this config
// with the active slug in DIRTBAG_STYLE.
//
// Unlike head-meta.spec.js and truck-icon.spec.js, this one is NOT skipped in
// CI. Both of those depend on the variation genuinely being applied, which the
// CI Playground boot may not do; every assertion here holds for *any* active
// variation, including the default, so a CI run that only ever scans the
// default style still tests something real.
//
// The rules under test live in theme.json's root `styles.css` — Dirtbag ships
// no CSS files (bin/package-check enforces that), so there is no print.css to
// link. See docs/testing.md.
const { test, expect } = require('@playwright/test');

const STYLE = process.env.DIRTBAG_STYLE || 'default';

const BLACK = 'rgb(0, 0, 0)';
const WHITE = 'rgb(255, 255, 255)';
const TRANSPARENT = 'rgba(0, 0, 0, 0)';

// Resolve a post from the front page rather than hardcoding a seeded permalink:
// the seed's dates move, and a stale URL would 404 into a meaningless pass.
async function firstPostPath(page) {
  await page.goto('/');
  const href = await page.locator('.wp-block-post-title a').first().getAttribute('href');
  expect(href, 'front page should link to at least one post').toBeTruthy();
  return new URL(href, page.url()).pathname;
}

const computed = (locator, property, pseudo = null) =>
  locator.evaluate(
    (el, [prop, pseudoEl]) => getComputedStyle(el, pseudoEl).getPropertyValue(prop),
    [property, pseudo]
  );

test.describe(`print stylesheet: ${STYLE}`, () => {
  test(`[${STYLE}] prints black ink on white paper`, async ({ page }) => {
    await page.goto('/');
    await page.emulateMedia({ media: 'print' });

    const body = page.locator('body');
    expect(await computed(body, 'color'), 'body text should print black').toBe(BLACK);
    expect(await computed(body, 'background-color'), 'the sheet should print white').toBe(WHITE);

    // The variation's colours reach individual blocks too, not just body — a
    // reset that only caught body would still print Terminal's green headings.
    const heading = page.locator('main :is(h1, h2, .wp-block-post-title)').first();
    expect(await computed(heading, 'color'), 'headings should print black').toBe(BLACK);

    const group = page.locator('main .wp-block-group').first();
    expect(
      await computed(group, 'background-color'),
      'block backgrounds should not print'
    ).toBe(TRANSPARENT);
  });

  test(`[${STYLE}] navigation and the skip link do not print`, async ({ page }) => {
    await page.goto('/');

    // Assert each is on screen FIRST. Without this, a selector that stopped
    // matching (a core markup change, say) would satisfy the print assertion by
    // matching nothing at all.
    const nav = page.locator('header .wp-block-navigation').first();
    await expect(nav, 'navigation should render on screen').toBeVisible();

    // There are TWO skip links on every page: core injects its own
    // screen-reader-only `#wp-skip-link` at the top of <body>
    // (wp_enqueue_block_template_skip_link()), and parts/header.html adds a
    // visible one of its own. Check every match, not `.first()` — that only
    // ever sees core's.
    const skipLinks = page.locator('a[href="#main-content"]');
    const skipLinkCount = await skipLinks.count();
    expect(skipLinkCount, 'the page should carry a skip link on screen').toBeGreaterThan(0);

    await page.emulateMedia({ media: 'print' });
    await expect(nav, 'navigation is unusable on paper').toBeHidden();
    for (let i = 0; i < skipLinkCount; i++) {
      await expect(skipLinks.nth(i), `skip link ${i + 1} is unusable on paper`).toBeHidden();
    }
  });

  test(`[${STYLE}] the article itself still prints`, async ({ page }) => {
    const post = await firstPostPath(page);
    await page.goto(post);

    const title = page.locator('main .wp-block-post-title').first();
    const content = page.locator('main .e-content').first();
    await expect(title).toBeVisible();
    await expect(content).toBeVisible();

    await page.emulateMedia({ media: 'print' });
    await expect(title, 'the post title must survive the print reset').toBeVisible();
    await expect(content, 'the post content must survive the print reset').toBeVisible();
  });

  test(`[${STYLE}] comment chrome does not print`, async ({ page }) => {
    const post = await firstPostPath(page);
    await page.goto(post);

    const form = page.locator('.wp-block-post-comments-form').first();
    await expect(form, 'comment form should render on screen').toBeVisible();

    await page.emulateMedia({ media: 'print' });
    await expect(form, 'a comment form cannot be filled in on paper').toBeHidden();
  });

  test(`[${STYLE}] link URLs are spelled out in print`, async ({ page }) => {
    const post = await firstPostPath(page);
    await page.goto(post);

    // Only links in the article body are spelled out — the byline, categories,
    // and tags are navigation, and printing four taxonomy URLs under every post
    // is clutter a reader cannot use. The webmention invitation in
    // templates/single.html carries an absolute external link on every post, so
    // this holds whatever the seeded prose does.
    const link = page.locator('main :is(.e-content, .webmention-invite) a[href^="http"]').first();
    await expect(link).toBeVisible();
    const href = await link.getAttribute('href');

    expect(
      await computed(link, 'content', '::after'),
      'URLs should not be spelled out on screen — they are clickable there'
    ).toBe('none');

    await page.emulateMedia({ media: 'print' });
    expect(
      await computed(link, 'content', '::after'),
      'a printed link is only useful if its URL is printed too'
    ).toContain(href);

    // The other half of that decision: taxonomy links stay bare.
    const terms = page.locator('main .p-category a[href^="http"]');
    expect(await terms.count(), 'the post should list terms').toBeGreaterThan(0);
    expect(
      await computed(terms.first(), 'content', '::after'),
      'category and tag URLs are navigation, not content — they should not print'
    ).toBe('none');
  });

  test(`[${STYLE}] the masthead logo is not inverted in print`, async ({ page }) => {
    await page.goto('/');
    const logo = page.locator('.h-card .wp-block-site-logo img').first();
    await expect(logo).toBeVisible();

    await page.emulateMedia({ media: 'print' });
    // The dark variations recolour the truck to a light ink via
    // `--wp--custom--dirtbag--truck-icon-filter` (see truck-icon.spec.js). On
    // white paper that is an invisible logo.
    expect(
      await computed(logo, 'filter'),
      'the truck should print as its own dark artwork, not the on-screen filter'
    ).toBe('none');
  });
});
