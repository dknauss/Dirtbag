// Boot gate: prove the running site is actually rendering the style variation
// the harness asked for, before any per-style suite runs against it.
//
// Why this exists. The CI per-style matrix applies a variation in a Playground
// `runPHP` boot step, where STDOUT, STDERR and the exit code are all swallowed.
// A step that "applied" a style but wrote it somewhere WordPress never reads
// therefore looked identical to a successful boot — and the whole e2e-styles
// matrix scanned the default style seven times while reporting per-style
// coverage. Rendered output is the only thing that cannot lie about this, so
// check that and fail the job before the sweep, not the sweep itself.
//
//   DIRTBAG_BASE_URL=http://127.0.0.1:9400 DIRTBAG_STYLE=terminal \
//     node tests/assert-style-applied.mjs
//
// Exits 0 when the rendered page matches what the slug declares in both the
// `styles` and the `settings` layer, 1 (with the mismatch printed) otherwise.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STYLE = process.env.DIRTBAG_STYLE || 'default';
const BASE = (process.env.DIRTBAG_BASE_URL || 'http://127.0.0.1:9400').replace(/\/$/, '');

if (!/^[a-z0-9-]+$/.test(STYLE)) {
  console.error(`assert-style-applied: invalid style slug: ${STYLE}`);
  process.exit(1);
}

// Source of truth for the slug — `default` falls back to theme.json. Both the
// `styles` and the `settings` layer are checked, because they reach the front
// end by different routes and have failed independently: `styles` was lost when
// the variation never reached the user global-styles post at all, `settings`
// when core's kses pass stripped `settings.custom` on save. One passing does not
// imply the other.
function declared(slug) {
  const file = slug === 'default'
    ? path.join(REPO, 'theme.json')
    : path.join(REPO, 'styles', `${slug}.json`);
  const json = JSON.parse(readFileSync(file, 'utf8'));

  // theme.json deliberately declares no background; the variations all do, and
  // bin/package-check requires each to be a literal hex. Refuse to run rather
  // than silently treat an unparseable colour as "declares nothing" — that would
  // turn this gate into one that passes on an unapplied style.
  const background = json?.styles?.color?.background;
  let expectedBackground = null;
  if (typeof background === 'string') {
    expectedBackground = normaliseHex(background);
    if (expectedBackground === null) {
      console.error(
        `assert-style-applied: ${slug} declares a non-hex background (${background}); ` +
        'this gate can only compare literal hex colours.'
      );
      process.exit(1);
    }
  }

  // Missing and "none" both mean an unfiltered truck.
  const filter = json?.settings?.custom?.dirtbag?.truckIconFilter;
  return {
    background: expectedBackground,
    truckFilter: typeof filter === 'string' ? normaliseSpace(filter) : 'none',
  };
}

const normaliseSpace = (value) => value.trim().replace(/\s+/g, ' ');

// #abc -> #aabbcc, lowercased. Returns null for anything that is not a literal
// hex — a variation using a preset var would need resolving against the
// stylesheet, which is out of scope for a boot gate.
function normaliseHex(value) {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim());
  if (!match) return null;
  const digits = match[1].length === 3
    ? match[1].split('').map((d) => d + d).join('')
    : match[1];
  return `#${digits.toLowerCase()}`;
}

// What the merged theme.json + user layer actually emitted, i.e. what the
// visitor sees: the `body` background from the styles layer, and the truck-icon
// custom property from the settings layer.
function rendered(html) {
  const stylesheet = /<style id="global-styles-inline-css"[^>]*>([\s\S]*?)<\/style>/i.exec(html);
  if (!stylesheet) return null;
  const css = stylesheet[1];

  // Last declaration wins, matching the cascade.
  let background = null;
  for (const rule of css.matchAll(/(?:^|[},])\s*body\s*\{([^}]*)\}/g)) {
    const declaration = /background-color\s*:\s*([^;]+)/i.exec(rule[1]);
    if (declaration) background = normaliseHex(declaration[1]);
  }

  let truckFilter = 'none';
  for (const declaration of css.matchAll(/--wp--custom--dirtbag--truck-icon-filter\s*:\s*([^;}]+)/g)) {
    truckFilter = normaliseSpace(declaration[1]);
  }

  return { background, truckFilter };
}

const expected = declared(STYLE);

const response = await fetch(`${BASE}/`);
if (!response.ok) {
  console.error(`assert-style-applied: ${BASE}/ returned HTTP ${response.status}`);
  process.exit(1);
}

const actual = rendered(await response.text());
if (!actual) {
  console.error('assert-style-applied: no global-styles stylesheet in the rendered page — is this a block theme boot?');
  process.exit(1);
}

const problems = [];
if (expected.background !== actual.background) {
  problems.push(
    `  styles layer — body background\n` +
    `    expected: ${expected.background ?? '(none declared)'}\n` +
    `    rendered: ${actual.background ?? '(none)'}`
  );
}
if (expected.truckFilter !== actual.truckFilter) {
  problems.push(
    `  settings layer — --wp--custom--dirtbag--truck-icon-filter\n` +
    `    expected: ${expected.truckFilter}\n` +
    `    rendered: ${actual.truckFilter}`
  );
}

if (problems.length) {
  console.error(
    `assert-style-applied: style "${STYLE}" did not fully apply.\n${problems.join('\n')}\n` +
    '  See playground/apply-style.php — a rendered default where a variation was\n' +
    '  requested means the variation never reached the user global-styles layer.'
  );
  process.exit(1);
}

console.log(
  `assert-style-applied: "${STYLE}" is applied ` +
  `(body background: ${actual.background ?? 'none, as declared'}; truck filter: ${actual.truckFilter}).`
);
