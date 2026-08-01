// Regression guard: user "Additional CSS" must not wipe the theme's own CSS.
//
// theme.json carries a root `styles.css` string with load-bearing rules — the
// truck-icon `filter`, the `.front-grid` subgrid, the sidebar thumbnails, and the
// gallery caption escape. Core merges global styles with `array_replace_recursive()`,
// and because root `styles.css` is a *string* rather than an array, any other
// origin that sets it REPLACES theme.json's value instead of appending. So a user
// who opened Site Editor → Styles → Additional CSS and typed anything at all
// silently deleted the theme's entire root stylesheet — the truck stopped being
// recoloured, the front page grid collapsed to plain flex columns, and gallery
// captions reverted to core's white-on-image overlay. No error, no obvious cause.
//
// `dirtbag_preserve_root_custom_css()` (functions.php) re-prepends theme.json's
// root CSS to the user layer, so both survive and the user's rules still win ties.
//
// The rules cannot instead move to per-block `styles.blocks.*.css`: core runs that
// through `WP_Theme_JSON::process_blocks_custom_css()`, which drops `@supports` /
// `@media` wrappers entirely and caps every rule at `:root :where(…)` (0-1-0)
// specificity — which would lose to core's own 0-4-0 gallery caption rule.
//
// Activation path mirrors sticking.spec.js: WP-CLI via `studio wp`, shell-exec'd
// between page loads. Local-Studio only; self-skips where the applier is absent.
//
// The active global styles are one piece of site state, so this and the other
// `@self-switching` spec must not run concurrently: use `npm run
// test:styles:additional-css` (or `test:styles:self-switching` for both), which
// pass `--workers=1`. axe-styles.sh excludes them from its per-style loop.
const { test, expect } = require('@playwright/test');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..');
const SITE = process.env.DIRTBAG_STUDIO_PATH || `${process.env.HOME}/Studio/dirtbag`;
const WP_CLI = process.env.DIRTBAG_WP_CLI || `studio wp --path ${SITE}`;
const THEME_DIR = process.env.DIRTBAG_THEME_DIR || '/wordpress/wp-content/themes/dirtbag';
const APPLIER = process.env.DIRTBAG_APPLIER || `${THEME_DIR}/playground/apply-style.php`;
const CSS_APPLIER = process.env.DIRTBAG_CSS_APPLIER || `${THEME_DIR}/playground/apply-additional-css.php`;

// A variation with a non-`none` truckIconFilter, so "is the filter applied?" is a
// meaningful question. Kept in step with styles/terminal.json via expectedFilter().
const STYLE = 'terminal';

// Must match DIRTBAG_USER_CSS_SENTINEL in playground/apply-additional-css.php.
const USER_CSS_PROPERTY = '--dirtbag-user-css';

// Seeded post whose gallery images carry captions (the Block Sampler gallery has
// none, so it cannot exercise the caption rule). Its permalink is date-based and
// the seed dates move, so the spec resolves the slug to a permalink at run time.
const GALLERY_SLUG = 'we-blamed-the-browser';

function expectedFilter(slug) {
  const file = path.join(REPO, 'styles', `${slug}.json`);
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  const value = json?.settings?.custom?.dirtbag?.truckIconFilter;
  return typeof value === 'string' ? value : 'none';
}

function wpCli(command) {
  return execSync(`${WP_CLI} ${command}`, {
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
  });
}

const applyAdditionalCss = (slug) => wpCli(`eval-file "${CSS_APPLIER}" ${slug}`);
const clearAdditionalCss = (slug) => wpCli(`eval-file "${CSS_APPLIER}" ${slug} clear`);
const emptyAdditionalCss = (slug) => wpCli(`eval-file "${CSS_APPLIER}" ${slug} empty`);
const applyStyle = (slug) => wpCli(`eval-file "${APPLIER}" ${slug}`);

// Refuse to run against a theme checkout that is not this repo — the same guard
// axe-styles.sh applies, for the same reason. This spec drives the applier itself
// rather than being driven by the sweep, so it would otherwise sidestep that
// check entirely: with Studio's shared wp-content/themes/dirtbag symlink pointed
// at another checkout, the browser and applier would act on the foreign tree
// while expectedFilter() read this one, and the cleanup in afterAll would rewrite
// somebody else's global-styles post.
//
// Studio serves host paths through a virtual mount, so realpath() returns
// /internal/symlinks<host path>; strip that one known prefix, then compare
// exactly. Both template and stylesheet must match, so an active child theme of
// Dirtbag cannot pass.
// Returns 'match' | 'mismatch' | 'unknown'. Callers decide what each means:
// reading is only worth doing against the right checkout, but *writing* to the
// wrong one is what actually damages another session, so the two have different
// tolerances for 'unknown'. Mirrors theme_checkout_state() in axe-styles.sh.
function themeCheckoutState() {
  let out;
  try {
    out = wpCli(
      `eval 'echo "DBSTART:" . realpath(get_template_directory()) . "|" . realpath(get_stylesheet_directory()) . ":DBEND";'`
    );
  } catch {
    return 'unknown';
  }
  const payload = out.replace(/\r/g, '').match(/DBSTART:(.*):DBEND/);
  if (!payload) {
    return 'unknown';
  }
  const [template, stylesheet] = payload[1].split('|').map((p) => p.replace(/^\/internal\/symlinks/, ''));
  const expected = process.env.DIRTBAG_EXPECTED_THEME_PATH || REPO;
  return template === expected && stylesheet === expected ? 'match' : 'mismatch';
}

// Entry guard. An undeterminable result is not a reason to invent a failure in
// an environment whose WP-CLI cannot run this eval, so it warns and proceeds —
// the test body only reads and writes this site's own global styles, which the
// afterAll restore then puts back.
function assertThemeCheckout() {
  const state = themeCheckoutState();
  if (state === 'unknown') {
    console.warn('additional-css: could not resolve the active theme directory; skipping checkout guard');
    return;
  }
  const expected = process.env.DIRTBAG_EXPECTED_THEME_PATH || REPO;
  expect(
    state,
    `the site's active theme must be this checkout (${expected}); another session may have repointed the Studio symlink`
  ).toBe('match');
}

// Resolved through WP-CLI rather than the REST API: the spec already depends on
// WP-CLI, and stray PHP notices from an unrelated broken mu-plugin are enough to
// make a JSON response unparseable while leaving `wp post list` output usable.
// Memoised — the permalink cannot change mid-test, and each `studio wp` round trip
// costs upwards of ten seconds.
let cachedGalleryPermalink;
function galleryPermalink() {
  if (!cachedGalleryPermalink) {
    const out = wpCli(`post list --post_type=post --name=${GALLERY_SLUG} --field=url`);
    const match = out.match(/https?:\/\/\S*\/[^\s]*/);
    expect(match, `permalink for seeded post "${GALLERY_SLUG}"`).toBeTruthy();
    cachedGalleryPermalink = match[0];
  }
  return cachedGalleryPermalink;
}

function applierAvailable() {
  try {
    execSync(`${WP_CLI} eval "echo 1;"`, { stdio: 'ignore', timeout: 30000 });
    return true;
  } catch {
    return false;
  }
}

// The four load-bearing effects of theme.json's root `styles.css`, read off the
// live page as computed style rather than as text in the markup — a rule that is
// present but outranked is still a regression.
async function readThemeCssEffects(page) {
  await page.goto('/', { waitUntil: 'networkidle' });

  const logo = page.locator('.h-card .wp-block-site-logo img').first();
  await expect(logo, 'masthead site logo should render').toBeVisible();

  const home = await page.evaluate((userCssProperty) => {
    const logoEl = document.querySelector('.h-card .wp-block-site-logo img');
    const grid = document.querySelector('.wp-block-columns.front-grid');
    const thumb = document.querySelector('.wp-block-post-featured-image.sidebar-thumb');
    return {
      logoFilter: getComputedStyle(logoEl).filter,
      gridDisplay: grid ? getComputedStyle(grid).display : null,
      thumbWidth: thumb ? getComputedStyle(thumb).width : null,
      userCss: getComputedStyle(document.body).getPropertyValue(userCssProperty).trim(),
    };
  }, USER_CSS_PROPERTY);

  await page.goto(galleryPermalink(), { waitUntil: 'networkidle' });
  const caption = page.locator('.wp-block-gallery.has-nested-images figure.wp-block-image figcaption').first();
  await expect(caption, 'seeded gallery caption should render').toBeAttached();
  const captionPosition = await caption.evaluate((el) => getComputedStyle(el).position);

  return { ...home, captionPosition };
}

function assertThemeCssIntact(effects, when) {
  // 1. The truck-icon rule — the `filter` that consumes
  //    `--wp--custom--dirtbag--truck-icon-filter`. Lives only in root styles.css.
  expect(effects.logoFilter, `truck-icon filter ${when}`).not.toBe('none');

  // 2. The .front-grid subgrid rule, inside `@supports` + `@media (min-width: 782px)`.
  //    Without it the columns fall back to core's plain flex layout.
  expect(effects.gridDisplay, `.front-grid display ${when}`).toBe('grid');

  // 3. The sidebar thumbnail sizing.
  expect(effects.thumbWidth, `.sidebar-thumb width ${when}`).toBe('60px');

  // 4. The gallery caption escape from core's absolutely-positioned overlay.
  expect(effects.captionPosition, `gallery caption position ${when}`).toBe('static');
}

test.describe('theme root CSS survives user Additional CSS', () => {
  test.afterAll(async () => {
    // Restore the default (empty) user layer for other test sessions — but only
    // after re-confirming the checkout, never on a cached result from the test
    // body. This hook runs even when the body aborted, including when it aborted
    // *because* the guard failed, and restoring writes global styles: an
    // unconditional cleanup would mutate the foreign site the guard just refused
    // to touch. Re-probing rather than trusting a flag matches axe-styles.sh's
    // restore(), and for the same reason — by now the earlier assertion may be
    // arbitrarily stale.
    // Positive match required. 'unknown' is not evidence of safety: a transient
    // probe failure — Studio restarting after another session repointed it, say —
    // would otherwise be followed by a write that lands on the foreign checkout,
    // which is exactly what this guard exists to prevent. Same stance, and the
    // same DIRTBAG_RESTORE_WITHOUT_PROBE escape hatch, as axe-styles.sh.
    const state = themeCheckoutState();
    if (state !== 'match' && !(state === 'unknown' && process.env.DIRTBAG_RESTORE_WITHOUT_PROBE === '1')) {
      console.warn(`additional-css: skipping restore — checkout ${state} (set DIRTBAG_RESTORE_WITHOUT_PROBE=1 to restore anyway)`);
      return;
    }
    try { applyStyle('default'); } catch { /* best-effort */ }
  });

  // @self-switching: see sticking.spec.js — excluded from axe-styles.sh's per-style loop.
  test(`[${STYLE}] Additional CSS does not wipe theme.json's root styles.css @self-switching`, async ({ page }) => {
    // Raised before the first WP-CLI call, not after. applierAvailable() alone
    // can burn its own 30s probe timeout when Studio is installed but stopped,
    // which is the whole 30s default — so a later setTimeout would arrive after
    // the test had already timed out, turning the documented self-skip into a
    // failure exactly when the runtime is unavailable. Several `studio wp` round
    // trips (~10-15s each on a cold runtime) plus six page loads need the room
    // regardless.
    test.setTimeout(240_000);

    test.skip(!applierAvailable(), 'requires the local Studio dirtbag site + WP-CLI (not available in CI / Playground)');
    // Desktop only: the .front-grid subgrid rule is gated on min-width 782px, so
    // the mobile project would legitimately see plain flex columns.
    test.skip(test.info().project.name !== 'desktop', 'front-grid subgrid applies at >=782px');

    // Before the first mutation: everything below writes global styles.
    assertThemeCheckout();

    expect(expectedFilter(STYLE), `${STYLE} must define a truckIconFilter for this test to mean anything`).not.toBe('none');

    // Baseline: variation applied, no Additional CSS. Everything should work.
    clearAdditionalCss(STYLE);
    const before = await readThemeCssEffects(page);
    assertThemeCssIntact(before, 'with no Additional CSS');
    expect(before.userCss, 'sentinel should be absent before Additional CSS is added').toBe('');

    // The regression: add Additional CSS, exactly as the Site Editor panel would.
    applyAdditionalCss(STYLE);
    const after = await readThemeCssEffects(page);
    assertThemeCssIntact(after, 'with Additional CSS added');

    // ...and the user's own CSS must still reach the page. A "fix" that simply
    // discarded the user layer would pass the assertions above.
    expect(after.userCss, 'user Additional CSS should still be applied').toBe('1');

    // Clearing the panel again. Core merges on the key, not the value, so a
    // `styles.css` left present but empty replaces theme.json's root CSS just as
    // a real rule does — the same regression, reached by undoing rather than
    // doing. An `empty()`/`trim()` guard in the filter passes every assertion
    // above and fails right here.
    emptyAdditionalCss(STYLE);
    const cleared = await readThemeCssEffects(page);
    assertThemeCssIntact(cleared, 'with Additional CSS present but empty');
    expect(cleared.userCss, 'sentinel should be gone once the panel is emptied').toBe('');
  });
});
