// Per-style truck-icon colour regression — asserts the in-page header logo
// carries the correct per-variation `truckIconFilter`, and that the value does
// not "stick" from a previously applied style.
//
// Like a11y-styles.spec.js, this scans whatever variation is currently active;
// the driver (tests/axe-styles.sh locally, the e2e-styles matrix in CI) applies
// each variation in turn via playground/apply-style.php and re-runs this config
// with the active slug in DIRTBAG_STYLE. The expected filter is read straight
// from the source of truth (theme.json for `default`, styles/<slug>.json
// otherwise) so the spec stays in lockstep with the styles instead of
// hardcoding a parallel table.
//
// This used to be skipped in CI, blamed on the filter "not being re-emitted in
// CI Playground". Two real bugs were hiding behind that: the variation was not
// being applied at all (a wp_global_styles post created without its `wp_theme`
// term), and core's kses pass on `content_save_pre` was stripping the whole
// `settings` tree — including `settings.custom.dirtbag.truckIconFilter` — out of
// the payload before it reached the database, leaving only theme.json's `none`.
// Both are fixed in playground/apply-style.php, so this now runs everywhere.
//
// Scope note: this is the *in-page* logo, which CSS recolours via
// `--wp--custom--dirtbag--truck-icon-filter`. The browser-tab favicon is a
// separate, opaque Site Icon and is deliberately NOT filtered — see
// docs/site-icons-and-logos.md. Covers docs/backlog.md → Release QA item 2.
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const STYLE = process.env.DIRTBAG_STYLE || 'default';
const REPO = path.resolve(__dirname, '..', '..');

// Source-of-truth `truckIconFilter` for the active style; `default` falls back
// to theme.json. Missing/None both normalise to the literal "none".
function expectedFilter(slug) {
  const file = slug === 'default'
    ? path.join(REPO, 'theme.json')
    : path.join(REPO, 'styles', `${slug}.json`);
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  const value = json && json.settings && json.settings.custom
    && json.settings.custom.dirtbag
    && json.settings.custom.dirtbag.truckIconFilter;
  return typeof value === 'string' ? value : 'none';
}

const norm = (s) => (s || '').trim().replace(/\s+/g, ' ');

test.describe(`truck icon colour: ${STYLE}`, () => {
  test(`[${STYLE}] header logo carries the right truckIconFilter`, async ({ page }) => {
    await page.goto('/');

    // The masthead logo lives inside the .h-card group; the navigation-overlay
    // Site Logo (a second block) is excluded so a collapsed overlay can't shadow
    // this assertion.
    const logo = page.locator('.h-card .wp-block-site-logo img').first();
    await expect(logo, 'masthead site logo should render').toBeVisible();

    const { cssVar, filter } = await logo.evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        cssVar: cs.getPropertyValue('--wp--custom--dirtbag--truck-icon-filter'),
        filter: cs.filter,
      };
    });

    const expected = expectedFilter(STYLE);

    // 1. The active variation's custom property actually reaches the logo. A
    //    value left over from a previously applied style mismatches here — this
    //    is the "colour does not stick between styles" guard.
    expect(norm(cssVar), `truckIconFilter custom property for "${STYLE}"`).toBe(norm(expected));

    // 2. The property is wired through to `filter`: a colouring variation applies
    //    a real filter; a "none" variation leaves the truck unfiltered. (We check
    //    none vs not-none rather than the exact string, since the browser
    //    normalises filter-function syntax.)
    if (norm(expected) === 'none') {
      expect(norm(filter), `computed filter for "${STYLE}"`).toBe('none');
    } else {
      expect(norm(filter), `computed filter for "${STYLE}" should be applied`).not.toBe('none');
    }
  });
});
