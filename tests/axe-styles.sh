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

# Preflight: refuse to run against a theme root that is not this repo.
#
# The Studio site reaches the theme through a single symlink at
# wp-content/themes/dirtbag, which is shared mutable state. A concurrent
# session that repoints it — an agent worktree under .claude/worktrees/, say —
# silently swaps the code under test, and the sweep then reports confident
# results for a tree that is not yours. That happened: styles early in the loop
# passed and later ones "failed", which reads exactly like a flaky race rather
# than the wrong checkout. Fail loudly instead.
REPO_ROOT="$(cd .. && pwd)"
resolved="$($WP_CLI eval 'echo realpath(get_template_directory());' 2>/dev/null \
  | grep -oE '/[^ ]*' | head -1 | tr -d '\r')"
if [ -z "$resolved" ]; then
  echo "preflight: could not resolve the active theme directory; continuing" >&2
elif [ "${resolved%"$REPO_ROOT"}" = "$resolved" ]; then
  echo "preflight: FAILED — the site's active theme resolves to" >&2
  echo "  $resolved" >&2
  echo "but this sweep is for" >&2
  echo "  $REPO_ROOT" >&2
  echo "Another session has likely repointed the Studio theme symlink. Repoint it," >&2
  echo "restart the site (Studio caches the resolution), and re-run." >&2
  exit 2
fi

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
  if [ -n "$SPEC" ]; then
    DIRTBAG_STYLE="$style" DIRTBAG_BASE_URL="$BASE" \
      npx playwright test --config playwright.styles.config.js "$SPEC" || fail=1
  else
    DIRTBAG_STYLE="$style" DIRTBAG_BASE_URL="$BASE" \
      npx playwright test --config playwright.styles.config.js --grep-invert "does not stick" || fail=1
  fi
done

exit "$fail"
