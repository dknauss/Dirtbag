// In-session A→B→A style-switch test: guards against the truck-icon filter (and
// any other per-variation CSS custom property) "sticking" from one variation to
// the next when the active global styles are changed mid-session on a live site.
//
// The per-instance harness (axe-styles.sh / ci-style-blueprint.mjs) applies one
// variation per Playwright process, so it cannot catch this class of regression.
// This spec exercises the same `apply-style.php` activation mechanism that the
// shell driver uses, but calls it multiple times within one Playwright session,
// on one running site.
//
// Activation path: `wp eval-file playground/apply-style.php <slug>` executed via
// `studio wp` (or the DIRTBAG_WP_CLI override) — the same WP-CLI call that
// axe-styles.sh uses. There is no in-browser REST/query-param path in this
// harness; the mutation must go through WP-CLI. The test therefore shell-execs
// between page loads exactly as the shell driver does.
//
// Style pair: terminal (coloured filter) → amber-crt (different colour) → terminal
// — a maximally distinguishable pair. The default style (no filter) is restored in
// afterAll so other tests start clean.
const { test, expect } = require('@playwright/test');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..');
const SITE = process.env.DIRTBAG_STUDIO_PATH || `${process.env.HOME}/Studio/dirtbag`;
const WP_CLI = process.env.DIRTBAG_WP_CLI || `studio wp --path ${SITE}`;
const APPLIER = process.env.DIRTBAG_APPLIER || '/wordpress/wp-content/themes/dirtbag/playground/apply-style.php';

// Style A and B for the switch sequence.
const STYLE_A = 'terminal';
const STYLE_B = 'amber-crt';

// Source-of-truth truckIconFilter — same logic as truck-icon.spec.js.
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

// Apply a style variation via WP-CLI (same mechanism as axe-styles.sh).
function applyStyle(slug) {
  execSync(`${WP_CLI} eval-file "${APPLIER}" "${slug}"`, {
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
  });
}

// Whether the local Studio applier is reachable. It is not in CI / Playground
// (no `studio` CLI, and styles are applied per-instance by the blueprint there),
// so this in-session switch test self-skips in those environments.
function applierAvailable() {
  try {
    execSync(`${WP_CLI} eval "echo 1;"`, { stdio: 'ignore', timeout: 30000 });
    return true;
  } catch {
    return false;
  }
}

// Read the truck-icon filter from the live front page.
async function readLiveFilter(page) {
  // Hard reload to bypass any browser cache so the new global styles take effect.
  await page.goto('/', { waitUntil: 'networkidle' });
  const logo = page.locator('.h-card .wp-block-site-logo img').first();
  await expect(logo, 'masthead site logo should render').toBeVisible();
  return logo.evaluate((el) =>
    getComputedStyle(el).getPropertyValue('--wp--custom--dirtbag--truck-icon-filter')
  );
}

test.describe('style-switch sticking guard (A→B→A)', () => {
  test.afterAll(async () => {
    // Always restore default so other test sessions start from a clean slate.
    try { applyStyle('default'); } catch { /* best-effort */ }
  });

  // @self-switching: applies styles itself, so axe-styles.sh excludes it from the
  // per-style loop (which would otherwise fight it for the active variation).
  test(`[${STYLE_A}→${STYLE_B}→${STYLE_A}] truck-icon filter does not stick @self-switching`, async ({ page }) => {
    test.skip(!applierAvailable(), 'requires the local Studio dirtbag site + apply-style.php (not available in CI / Playground)');
    const expectedA = norm(expectedFilter(STYLE_A));
    const expectedB = norm(expectedFilter(STYLE_B));

    // Sanity: A and B must differ so the test is meaningful.
    expect(expectedA, 'STYLE_A and STYLE_B must have distinct filters').not.toBe(expectedB);

    // Step 1: Apply A, verify live value matches A.
    applyStyle(STYLE_A);
    const filterAfterA = norm(await readLiveFilter(page));
    expect(filterAfterA, `after applying ${STYLE_A}`).toBe(expectedA);

    // Step 2: Apply B, verify live value matches B (not A).
    applyStyle(STYLE_B);
    const filterAfterB = norm(await readLiveFilter(page));
    expect(filterAfterB, `after applying ${STYLE_B}`).toBe(expectedB);
    expect(filterAfterB, `${STYLE_B} filter should not be the same as ${STYLE_A}`).not.toBe(expectedA);

    // Step 3: Re-apply A, verify live value matches A again (no sticking from B).
    applyStyle(STYLE_A);
    const filterAfterReturn = norm(await readLiveFilter(page));
    expect(filterAfterReturn, `after returning to ${STYLE_A} — must equal original A value`).toBe(expectedA);
    expect(filterAfterReturn, `after returning to ${STYLE_A} — must not be ${STYLE_B} value`).not.toBe(expectedB);
  });
});
