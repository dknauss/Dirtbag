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

# Guard: refuse to run against a theme checkout that is not this repo.
#
# The Studio site reaches the theme through a single symlink at
# wp-content/themes/dirtbag, which is shared mutable state. A concurrent
# session that repoints it — an agent worktree under .claude/worktrees/, say —
# silently swaps the code under test, and the sweep then reports confident
# results for a tree that is not yours. That happened: styles early in the loop
# passed and later ones "failed", which reads exactly like a flaky race rather
# than the wrong checkout. Fail loudly instead.
#
# Checked before AND after every style, not once up front: the swap we are
# guarding against happens mid-run. A single preflight would wave through
# exactly the case that motivated this, and a pre-style check alone would still
# let a swap during the final style exit 0.
REPO_ROOT="$(cd .. && pwd -P)"

# What the site's theme directory is expected to resolve to. Defaults to this
# checkout, which is right for the Studio setup this script targets. Override it
# when the site legitimately reaches the theme by another path — a Playground /
# wp-now mount, say, where the theme lives at /wordpress/wp-content/themes/dirtbag
# rather than at the host checkout path (cf. DIRTBAG_WP_CLI and APPLIER above).
EXPECTED_THEME_PATH="${DIRTBAG_EXPECTED_THEME_PATH:-$REPO_ROOT}"

# Studio serves host paths through a virtual mount, so realpath() returns
# /internal/symlinks<host path>. Strip that one known prefix, then compare
# exactly — a suffix test would accept /tmp/workspace/dirtbag as
# /workspace/dirtbag.
normalize_theme_path() { printf '%s' "${1#/internal/symlinks}"; }

# Both the template and the stylesheet directory must be this repo. Checking
# only the template would pass an active *child* theme of Dirtbag, whose own
# templates and styles come from somewhere else entirely.
#
# The sentinel wrapper keeps this robust against PHP notices, which Studio can
# emit on the same line as the value; reading the whole payload (rather than a
# space-delimited token) keeps paths containing spaces intact.
resolve_theme_paths() {
  $WP_CLI eval 'echo "DBSTART:" . realpath(get_template_directory()) . "|" . realpath(get_stylesheet_directory()) . ":DBEND";' 2>/dev/null \
    | tr -d '\r' \
    | sed -n 's/.*DBSTART:\(.*\):DBEND.*/\1/p' \
    | head -1
}

assert_theme_checkout() {
  local when="$1" payload template stylesheet
  payload="$(resolve_theme_paths)"

  if [ -z "$payload" ]; then
    # Can't determine it — warn rather than invent a failure, since other
    # environments may not support this eval.
    echo "warning ($when): could not resolve the active theme directory" >&2
    return 0
  fi

  template="$(normalize_theme_path "${payload%%|*}")"
  stylesheet="$(normalize_theme_path "${payload##*|}")"

  if [ "$template" = "$EXPECTED_THEME_PATH" ] && [ "$stylesheet" = "$EXPECTED_THEME_PATH" ]; then
    return 0
  fi

  # Mark the checkout foreign BEFORE exiting, so the EXIT trap does not go on to
  # write default global styles into somebody else's site.
  checkout_is_foreign=1

  echo "FAILED ($when): the site's active theme is not the expected checkout." >&2
  echo "  template:   $template" >&2
  echo "  stylesheet: $stylesheet" >&2
  echo "  expected:   $EXPECTED_THEME_PATH" >&2
  echo "Another session has likely repointed the Studio theme symlink, or a child" >&2
  echo "theme is active. Repoint it, restart the site (Studio caches the" >&2
  echo "resolution), and re-run. If the theme is legitimately served from another" >&2
  echo "path, set DIRTBAG_EXPECTED_THEME_PATH." >&2
  exit 2
}

checkout_is_foreign=0

assert_theme_checkout "preflight"

apply() { $WP_CLI eval-file "$APPLIER" "$1" >/dev/null 2>&1; }

# Restoring writes global styles, so it must never run once we know the site is
# serving a different checkout — that would mutate another session's state as a
# side effect of our own abort.
restore() {
  if [ "$checkout_is_foreign" = "1" ]; then
    echo "== skipping restore: the site is serving a different checkout ==" >&2
    return
  fi
  echo "== restoring default global styles =="
  apply default
}
trap restore EXIT

fail=0
for style in "${STYLES[@]}"; do
  echo "== style: $style =="
  # Re-assert before each style: a mid-run swap must abort, not quietly test
  # the other checkout for the remaining iterations.
  assert_theme_checkout "before style '$style'"
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
  # And again afterwards: a swap *during* this style would otherwise let its
  # results — including the last style's, and so the whole run's exit 0 — stand.
  assert_theme_checkout "after style '$style'"
done

exit "$fail"
