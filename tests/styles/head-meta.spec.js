// Per-style <head> colour metadata — asserts the active variation emits a
// matching `color-scheme` and `theme-color`, and that the default style (which
// declares no background) emits neither.
//
// Like truck-icon.spec.js, this scans whatever variation is currently active;
// the driver (tests/axe-styles.sh locally, the e2e-styles matrix in CI) applies
// each variation in turn and re-runs this config with the active slug in
// DIRTBAG_STYLE. The expected values are derived from the source of truth
// (styles/<slug>.json) rather than a parallel hardcoded table.
//
// The luminance maths below deliberately re-implements
// dirtbag_color_scheme_for() from functions.php in JavaScript: two independent
// implementations agreeing is a stronger check than one asserting against
// itself. The PHP side is unit-tested separately in
// tests/php/color-scheme-test.php.
//
// History: this spec's first CI run failed on all six variations with *zero*
// tags while passing on `default` — the signature of the variation never being
// applied at all. That turned out to be a real bug in the harness, not in the
// tags: playground/apply-style.php wrote the variation to a wp_global_styles
// post it had created without its `wp_theme` term, so WordPress never read it
// back. The CI matrix had been scanning the default style seven times. Fixed in
// apply-style.php and now gated by tests/assert-style-applied.mjs, which fails
// the boot before this spec can be blamed for it.
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const STYLE = process.env.DIRTBAG_STYLE || 'default';
const REPO = path.resolve(__dirname, '..', '..');

// Source-of-truth background for the active style; `default` falls back to
// theme.json, which deliberately declares none.
function declaredBackground(slug) {
  const file = slug === 'default'
    ? path.join(REPO, 'theme.json')
    : path.join(REPO, 'styles', `${slug}.json`);
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  const value = json && json.styles && json.styles.color && json.styles.color.background;
  return typeof value === 'string' ? value : null;
}

// WCAG 2.x relative luminance. Mirrors dirtbag_relative_luminance().
function relativeLuminance(hex) {
  if (typeof hex !== 'string' || !/^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/.test(hex)) return null;
  let digits = hex.slice(1);
  if (digits.length === 3) digits = digits.split('').map((d) => d + d).join('');
  const coefficients = [0.2126, 0.7152, 0.0722];
  return [0, 2, 4].reduce((sum, offset, i) => {
    const channel = parseInt(digits.substr(offset, 2), 16) / 255;
    const linear = channel <= 0.03928
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4);
    return sum + coefficients[i] * linear;
  }, 0);
}

// Equal-contrast threshold against black and white. Mirrors
// dirtbag_color_scheme_for().
function colorSchemeFor(hex) {
  const luminance = relativeLuminance(hex);
  if (luminance === null) return null;
  return luminance > Math.sqrt(1.05 * 0.05) - 0.05 ? 'light' : 'dark';
}

test.describe(`head colour metadata: ${STYLE}`, () => {
  test(`[${STYLE}] color-scheme and theme-color match the active background`, async ({ page }) => {
    await page.goto('/');

    const background = declaredBackground(STYLE);
    const schemeTags = page.locator('meta[name="color-scheme"]');
    const colorTags = page.locator('meta[name="theme-color"]');

    if (background === null) {
      // The default Brutalist style rides the user-agent default: no declared
      // colour, no claim. Emitting either tag here would be a guess.
      await expect(schemeTags, 'default style should not claim a color-scheme').toHaveCount(0);
      await expect(colorTags, 'default style should not claim a theme-color').toHaveCount(0);
      return;
    }

    // Exactly one of each — a second would mean the tag is being emitted twice
    // (e.g. a duplicate hook registration).
    await expect(schemeTags, 'exactly one color-scheme tag').toHaveCount(1);
    await expect(colorTags, 'exactly one theme-color tag').toHaveCount(1);

    const expectedScheme = colorSchemeFor(background);
    expect(expectedScheme, `styles/${STYLE}.json background should classify`).not.toBeNull();

    await expect(schemeTags, `color-scheme for "${STYLE}"`).toHaveAttribute('content', expectedScheme);
    await expect(colorTags, `theme-color for "${STYLE}"`)
      .toHaveAttribute('content', new RegExp(`^${background}$`, 'i'));

    // The tag is not just present — the browser actually honours it. This is
    // what makes form controls and scrollbars render dark on the dark
    // variations instead of as light UA widgets on a black page.
    //
    // Probe the UA system colours, NOT getComputedStyle().colorScheme: a
    // `<meta name="color-scheme">` sets the page's *used* colour scheme without
    // reflecting into the computed CSS `color-scheme` property, which stays
    // "normal" unless a stylesheet declares it (verified in Chrome 141 against
    // this site). The `Canvas` system colour does follow the used scheme —
    // rgb(18,18,18) under dark, rgb(255,255,255) under light.
    const canvas = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.style.cssText = 'background: Canvas;';
      document.body.appendChild(probe);
      const value = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return value;
    });

    const [r, g, b] = canvas.match(/\d+/g).map(Number);
    const canvasIsDark = relativeLuminance(
      `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`
    ) < 0.5;

    expect(
      canvasIsDark ? 'dark' : 'light',
      `browser should honour color-scheme for "${STYLE}" (Canvas resolved to ${canvas})`
    ).toBe(expectedScheme);
  });
});
