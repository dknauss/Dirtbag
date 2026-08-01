// Emits a CI Playground blueprint to stdout: the base tests/blueprint.json with
// __REF__ pinned to $REF plus a step that applies $STYLE as the active global
// styles, so the per-style sweep scans that variation on this boot.
//
// Playground in CI is in-memory with no persistent wp-cli, so — unlike the local
// Studio sweep (tests/axe-styles.sh) — each style gets its own boot via the
// e2e-styles matrix. See .github/workflows/e2e.yml, which gates the sweep behind
// tests/assert-style-applied.mjs so an unapplied variation fails the job rather
// than quietly re-scanning the default.
//
//   REF=<sha> STYLE=terminal node tests/ci-style-blueprint.mjs > tests/blueprint.ci.json
import { readFileSync } from 'node:fs';

const ref = process.env.REF || 'main';
const style = process.env.STYLE || 'default';

if (!/^[a-z0-9-]+$/.test(style)) {
  throw new Error(`invalid style slug: ${style}`);
}

const base = readFileSync(new URL('./blueprint.json', import.meta.url), 'utf8');
const bp = JSON.parse(base.replaceAll('__REF__', ref));

// Apply on every slug, `default` included. Skipping it would leave the default
// boot with no user global-styles layer at all, so a boot that silently failed
// to apply would be indistinguishable from a correct `default` boot — and that
// is precisely how the termless-orphan bug (see playground/apply-style.php) hid
// for so long. Applying `default` explicitly means every matrix leg exercises
// the same code path, and tests/assert-style-applied.mjs can then check all
// seven against the same expectation.
bp.steps.push({
  step: 'runPHP',
  // $args is read by playground/apply-style.php exactly as it is under `wp
  // eval-file <file> <slug>`; a require shares this scope, so it sees the slug.
  // Verified against Playground 3.1.42 — the slug does arrive. (An earlier
  // theory blamed this construction for the styles never applying; the actual
  // cause was the missing wp_theme term.)
  code: `<?php require '/wordpress/wp-load.php'; $args = ['${style}']; require get_theme_file_path('playground/apply-style.php');`,
});

process.stdout.write(`${JSON.stringify(bp, null, 2)}\n`);
