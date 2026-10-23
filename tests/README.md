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
npm ci
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

### Browser environment on GitHub

CI uses the official Playwright Noble container with browsers and Linux libraries
already installed. `tests/ci-browser-environment.mjs` derives the image tag from
all three Playwright versions in `tests/package-lock.json`; mismatched, missing,
or non-stable versions fail the setup job. Both browser jobs use that output and
`npm ci`, so dependency installation cannot float to a different browser version.
No matrix job runs APT or `playwright install --with-deps`.

Before WordPress boots, `tests/assert-ci-browsers.mjs` checks the installed package
version and `/ms-playwright` path, then launches Chromium and WebKit and renders a
small document. A missing binary or system library fails that named preflight,
rather than surfacing as a WordPress/test failure. Image pulls and npm downloads
still need network access; browser jobs have a 20-minute ceiling, npm installation
five minutes, and browser preflight two minutes. Test assertion timeouts are
unchanged.

When upgrading Playwright, commit the updated lockfile and verify that its matching
stable `mcr.microsoft.com/playwright:v<VERSION>-noble` image is published. The image
selection tests run with `node --test tests/ci-browser-environment.test.mjs` without
installing dependencies. All seven styles must pass on GitHub before merging a
browser-environment change; a local pass does not replace that verification.

See [Playwright’s Docker guidance](https://playwright.dev/docs/docker) for image
contents and the requirement to match package and image versions.
