# Dirtbag test harness

Dev-only. Not shipped — `tests/` is `export-ignore`d and excluded from the
`bin/package-check` asset scans.

## Layers

1. **`bin/package-check`** (repo root, no dependencies) — static package + content
   integrity: required files, JSON validity, block nesting in templates **and the
   decoded Playground seed**, malformed block delimiters, reconcile artifacts,
   i18n text domain, screenshot size, hygiene, and PHP syntax.
2. **Playwright** (`tests/`) — smoke + accessibility (axe) against a running site.

## Run Playwright

Against the local Studio site (default `http://localhost:8887`):

```sh
cd tests
npm install
npm run install:browsers
npm test
```

Browser automation needs a browser-capable session — start one with
`claude-playwright`, or run the commands in your own shell.

Against any URL:

```sh
DIRTBAG_BASE_URL=https://your-site.test npm test
```

## CI

`.github/workflows/e2e.yml` boots WordPress 7.0 in WordPress Playground (theme
installed at the tested commit + seeded demo content) and runs this suite.
`.github/workflows/package-check.yml` runs the static checks on every push/PR.


Both browser jobs use `.github/scripts/boot-playground.sh`. Run its deterministic
failure-path checks with `node --test tests/boot-playground.test.mjs` from the repo
root. See [boot diagnostics](../docs/testing-strategy.md#shared-playground-boot-and-diagnostics-128)
for probe meanings, PHP diagnostic output, retry behavior and failure artifacts.
