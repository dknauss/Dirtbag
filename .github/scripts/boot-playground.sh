#!/usr/bin/env bash
# Shared CI boot runner. The generated blueprint already contains the style.
set -euo pipefail
if [ "$#" -ne 3 ] || [ ! -r "$1" ]; then
  echo "Usage: $0 <generated-blueprint.json> <WordPress-version> <PHP-version>" >&2
  exit 2
fi
BLUEPRINT=$1
WP_VERSION=$2
PHP_VERSION=$3
BOOT_PORT=${DIRTBAG_BOOT_PORT:-9400}
if ! [[ "$BOOT_PORT" =~ ^[1-9][0-9]{0,4}$ ]] || (( BOOT_PORT > 65535 )); then
  echo "Invalid Playground port: $BOOT_PORT" >&2
  exit 2
fi
BOOT_URL="http://127.0.0.1:$BOOT_PORT"
LOG_DIR=${DIRTBAG_BOOT_LOG_DIR:-${RUNNER_TEMP:-/tmp}/dirtbag-playground}
mkdir -p "$LOG_DIR"

# Pinned to 3.1.42, the release that fixes the intermittent EBADF /
# connection-refused boot crash (WordPress/wordpress-playground#3830,
# fixed by PR #3833 — stale SQLite WAL .ht.sqlite-shm lock cleanup).
# GitHub's four-CPU runner defaults to three request workers, and the
# CLI warns that fewer than six increases file-lock deadlock risk.
# Pin six: the three-worker default intermittently leaves SQLite
# returning "Database Error" for an otherwise-live server.
free_port() {
  # Each launch owns a session/process group, including npx's worker children.
  # Stop only that group; never pkill another Playground or an unrelated port.
  if [ -s "$LOG_DIR/pg.pid" ]; then
    local pid
    pid=$(cat "$LOG_DIR/pg.pid")
    kill -TERM -- "-$pid" 2>/dev/null || true
    for _ in $(seq 1 15); do
      kill -0 -- "-$pid" 2>/dev/null || break
      sleep 1
    done
    kill -KILL -- "-$pid" 2>/dev/null || true
    wait "$pid" 2>/dev/null || true
  fi
  for _ in $(seq 1 15); do
    (exec 3<>/dev/tcp/127.0.0.1/"$BOOT_PORT") 2>/dev/null || return 0
    sleep 1
  done
  echo "::error::Port $BOOT_PORT remains occupied after stopping the owned process group."
  return 1
}
boot() {
  # Capture the server's own output. A failing `runPHP` boot step
  # reports itself here and nowhere else, so without this a boot
  # failure is unattributable.
  # setsid before exec keeps the recorded PID equal to the owned group ID.
  python3 -c 'import os, sys; os.setsid(); os.execvp(sys.argv[1], sys.argv[1:])' \
    npx @wp-playground/cli@3.1.42 server --wp="$WP_VERSION" --php="$PHP_VERSION" --workers=6 --port "$BOOT_PORT" --blueprint="$BLUEPRINT" > "$LOG_DIR/pg.log" 2>&1 &
  echo $! > "$LOG_DIR/pg.pid"
  # Do not send requests while the blueprint is installing and
  # seeding WordPress. Those reads race SQLite writes and can leave an
  # otherwise-live server returning "Database Error". Wait for the
  # CLI's own ready signal first; bail early if the server dies.
  : > "$LOG_DIR/pg.probe"
  : > "$LOG_DIR/pg.home"
  cli_ready=no
  for i in $(seq 1 60); do
    if grep -q 'Ready!' "$LOG_DIR/pg.log"; then cli_ready=yes; break; fi
    kill -0 "$(cat "$LOG_DIR/pg.pid")" 2>/dev/null || return 1
    printf 'after %ss: cli-ready=no\n' "$(( i * 2 ))" > "$LOG_DIR/pg.probe"
    sleep 2
  done
  [ "$cli_ready" = yes ] || return 1

  # Ready only when the homepage renders the seeded featured image,
  # a published author is visible through REST, and no PHP/database errors
  # appear. The REST probe is visibility, not a user-identity write check;
  # seed assertions and the browser link-name gate cover identity separately.
  #
  # Record each condition separately. Collapsed into one `if`, a
  # timeout could not say whether the theme never installed (a
  # git:directory fetch problem) or installed but never seeded (a
  # runPHP/worker problem) — the two have different fixes.
  for i in $(seq 1 60); do
    theme_ok=no; image_ok=no; author_ok=no; clean_ok=no
    if curl -sfo /dev/null "$BOOT_URL/wp-content/themes/dirtbag/style.css"; then theme_ok=yes; fi
    # One fetch, two conditions. WP_DEBUG_DISPLAY is on, so a query
    # that fails anyway — the ready signal and six workers above make
    # that rarer, not impossible — prints `<div id="error">` ahead of
    # the doctype. The parser lands it in <body> outside every
    # landmark, and axe reports `region`, blaming the theme for a boot
    # that actually corrupted its own SQLite database. A page carrying
    # rendered PHP/database errors is a failed boot, not a regression.
    if curl -sf "$BOOT_URL/" > "$LOG_DIR/pg.home"; then
      if grep -q wp-post-image "$LOG_DIR/pg.home"; then image_ok=yes; fi
      if ! grep -qE 'class="wpdberror"|<b>(Fatal error|Parse error|Warning|Notice|Deprecated)</b>' "$LOG_DIR/pg.home"; then clean_ok=yes; fi
    fi
    if curl -sf "$BOOT_URL/wp-json/wp/v2/users?per_page=100" | grep -q '"slug":"roadside-archivist"'; then author_ok=yes; fi
    printf 'after %ss: theme-installed=%s featured-image=%s published-author-slug=%s no-php-errors=%s\n' \
      "$(( i * 2 ))" "$theme_ok" "$image_ok" "$author_ok" "$clean_ok" > "$LOG_DIR/pg.probe"
    if [ "$theme_ok" = yes ] && [ "$image_ok" = yes ] && [ "$author_ok" = yes ] && [ "$clean_ok" = yes ]; then return 0; fi
    kill -0 "$(cat "$LOG_DIR/pg.pid")" 2>/dev/null || return 1
    sleep 2
  done
  return 1
}
for attempt in 1 2 3; do
  echo "::group::Playground boot attempt $attempt"
  if boot; then echo "seeded after attempt $attempt"; echo "::endgroup::"; exit 0; fi
  echo "boot attempt $attempt failed; retrying" >&2
  # Say why. Without this the only signal is "failed".
  echo "--- diagnostics for attempt $attempt ---" >&2
  echo "HTTP: $(curl -s -o /dev/null -w '%{http_code}' "$BOOT_URL/" 2>&1)" >&2
  echo "last probe state: $(cat "$LOG_DIR/pg.probe" 2>/dev/null || echo '(never probed)')" >&2
  # With WP_DEBUG_DISPLAY on (tests/blueprint.json), a fatal renders
  # into the response body — so capture the body, not just the status.
  # `curl -f` suppresses output on a 5xx, so this one must omit it.
  echo "--- response body (first 60 lines) ---" >&2
  curl -s "$BOOT_URL/" 2>&1 | head -60 >&2 || echo "(no response)" >&2
  # Name the rendered errors directly: a notice further down the page
  # would not appear in the 60-line head, and `no-php-errors=no` on
  # its own does not say which query or file failed.
  echo "--- rendered PHP/database errors on / ---" >&2
  grep -nE 'class="wpdberror"|<b>(Fatal error|Parse error|Warning|Notice|Deprecated)</b>' "$LOG_DIR/pg.home" 2>/dev/null | head -3 >&2 || echo "(none)" >&2
  echo "--- last 40 lines of the Playground server log ---" >&2
  tail -40 "$LOG_DIR/pg.log" >&2 2>/dev/null || echo "(no server log)" >&2
  echo "::endgroup::"
  for name in log probe home; do
    if [ -f "$LOG_DIR/pg.$name" ]; then cp "$LOG_DIR/pg.$name" "$LOG_DIR/attempt-$attempt.$name"; fi
  done
  free_port
done
echo "::error::Playground failed to boot (theme stylesheet + wp-post-image + published author slug + no rendered PHP errors) after 3 attempts; aborting so the suite does not run against a mis-seeded site."
exit 1
