#!/usr/bin/env bash
# Per-style accessibility sweep: apply each Dirtbag style variation to the live
# site, run axe against the seeded pages, then restore the default. Sequential by
# necessity — the active variation is global site state, so parallel runs would
# race on it. See docs/testing-strategy.md → "Per-style accessibility sweep".
#
# Local (WordPress Studio) is the default. Override DIRTBAG_WP_CLI to point at a
# different WP-CLI (e.g. a Playground/wp-now invocation) in other environments.
#
#   ./axe-styles.sh                       # sweep a11y + truck-icon + screenshots per style
#   ./axe-styles.sh truck-icon            # one spec across all styles (see test:styles:* scripts)
#   DIRTBAG_BASE_URL=http://… ./axe-styles.sh
set -uo pipefail

SITE="${DIRTBAG_STUDIO_PATH:-$HOME/Studio/dirtbag}"
BASE="${DIRTBAG_BASE_URL:-http://localhost:8887}"
WP_CLI="${DIRTBAG_WP_CLI:-studio wp --path $SITE}"
APPLIER="${DIRTBAG_APPLIER:-/wordpress/wp-content/themes/dirtbag/playground/apply-style.php}"
STYLES=(default terminal amber-crt blueprint hi-vis minimalist newspaper)

# Optional Playwright file filter (e.g. `truck-icon`, `screenshots`, `a11y-styles`)
# passed by the test:styles:* npm scripts. With no argument, run the per-style
# specs EXCEPT the in-session sticking test — it self-switches styles via the
# applier and must not run inside this per-style loop.
SPEC="${1:-}"

cd "$(dirname "$0")"

apply() { $WP_CLI eval-file "$APPLIER" "$1" >/dev/null 2>&1; }

restore() { echo "== restoring default global styles =="; apply default; }
trap restore EXIT

fail=0
for style in "${STYLES[@]}"; do
  echo "== style: $style =="
  if ! apply "$style"; then
    echo "  apply failed for $style"
    fail=1
    continue
  fi
  # A successful `apply` is not proof the site renders the variation — see
  # docs/testing-strategy.md for the two ways that came apart. Check the rendered
  # page before scanning it, so a per-style result can never be a default in
  # disguise. Same gate the CI matrix uses.
  if ! DIRTBAG_STYLE="$style" DIRTBAG_BASE_URL="$BASE" node assert-style-applied.mjs; then
    fail=1
    continue
  fi
  if [ -n "$SPEC" ]; then
    DIRTBAG_STYLE="$style" DIRTBAG_BASE_URL="$BASE" \
      npx playwright test --config playwright.styles.config.js "$SPEC" || fail=1
  else
    DIRTBAG_STYLE="$style" DIRTBAG_BASE_URL="$BASE" \
      npx playwright test --config playwright.styles.config.js --grep-invert "does not stick" || fail=1
  fi
done

exit "$fail"
