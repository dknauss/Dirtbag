// Emits a CI Playground blueprint to stdout: the base tests/blueprint.json with
// __REF__ pinned to $REF and an explicitly applied $STYLE. The default leg
// applies terminal first, then resets it, so a missing reset is observable.
//
// Playground in CI is in-memory with no persistent wp-cli, so — unlike the local
// Studio sweep (tests/axe-styles.sh) — each style gets its own boot via the
// e2e-styles matrix. See .github/workflows/e2e.yml.
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

// Install diagnostics only in the disposable CI site, never in the theme package.
bp.steps.push({
  step: 'writeFile',
  path: '/wordpress/wp-content/mu-plugins/dirtbag-ci-state.php',
  data: readFileSync(new URL('./ci-state.php', import.meta.url), 'utf8'),
});
// Poison the default leg first: an omitted reset must leave detectable state.
for (const slug of (style === 'default' ? ['terminal', 'default'] : [style])) {
  bp.steps.push({
    step: 'runPHP',
    code: `<?php require '/wordpress/wp-load.php'; $admins = get_users(['role' => 'administrator', 'number' => 1]); if (!$admins) { throw new Exception('CI apply requires a sandbox administrator'); } wp_set_current_user($admins[0]->ID); $args = ['${slug}']; require '/wordpress/wp-content/themes/dirtbag/playground/apply-style.php'; update_option('dirtbag_ci_style_receipt', ['style' => '${slug}', 'post_id' => WP_Theme_JSON_Resolver::get_user_global_styles_post_id()]);`,
  });
}

process.stdout.write(`${JSON.stringify(bp, null, 2)}\n`);
