# Testing guide

Dirtbag testing should stay small, repeatable, and honest. Static checks catch packaging mistakes; browser checks catch editor and front-end behaviour.

## Static package check

Run from the repo root:

```sh
bin/package-check
```

The script checks:

- Required theme files.
- Valid `theme.json` and style variation JSON.
- `screenshot.png` dimensions.
- Template and template-part block nesting.
- Package hygiene.
- No suspicious raw front-end code patterns.
- No bundled JavaScript, font files, or extra CSS files.
- PHP syntax for pattern files.
- **Seed/demo content integrity** — reads `playground/seed-content.json` (the seed data, loaded by `seed-content.php`) and checks each post for malformed block delimiters, balanced block nesting, and reconcile artifacts (`core/post-data`, hardcoded theme slug, dev URLs).
- **No `base64_decode`** in any pattern or Playground PHP file (WordPress.org Theme Check disallows it).
- **Reconcile guardrails** across shipped block files (same artifacts), so a raw Site-Editor export cannot silently reintroduce them.
- **i18n** — pattern translation calls use the `dirtbag` text domain.

## Automated end-to-end and accessibility tests

A dev-only Playwright harness lives in `tests/` (export-ignored, not shipped). It runs smoke checks (key pages return, the 404 template loads, the front page features posts, archive/search render) and accessibility checks (axe WCAG 2 A/AA, the skip link, the mobile navigation overlay) against a running site.

Run it against the local Studio site or any URL — see [`tests/README.md`](../tests/README.md). Prefer running these headless checks in-session over handing off — see **Browser & visual testing tiers** below and the project [`CLAUDE.md`](../CLAUDE.md).

In CI, `.github/workflows/e2e.yml` boots WordPress 7.0 in WordPress Playground with the theme and seeded demo content, then runs the suite. (First-run note: the Playground boot and the axe baseline may need tuning, since the harness was authored without a local Node/browser environment.)

## Manual WordPress checks

Before release, verify in WordPress:

- Theme appears in **Appearance → Themes**.
- Theme activates without errors.
- Site Editor opens without template errors.
- Front page, home, single, page, archive, search, 404, comments, and footer render correctly.
- Style variations appear under **Appearance → Editor → Styles**.
- Default/brutalist mode does not load theme-authored CSS or JavaScript files.

## Browser & visual testing tiers

Detect what the session can do and pick the lowest tier (the Dirtbag layer under the global capability-detecting handoff rule; the project [`CLAUDE.md`](../CLAUDE.md) has the agent-facing version):

1. **Headless-scriptable (default)** — run the `tests/` harness from the CLI; no handoff:
   - per-style a11y / axe: `cd tests && ./axe-styles.sh` (or `npm run test:styles`)
   - truck-icon filter per style: `tests/styles/truck-icon.spec.js`
   - per-style `<head>` colour metadata: `tests/styles/head-meta.spec.js`
   - in-session A→B→A style-sticking guard: `tests/styles/sticking.spec.js` — **mutates the live site**; run it *outside* the per-style sweep (it shares the global-styles post)
   - per-style front-page screenshots → `tests/screenshots/<slug>.png`: `tests/styles/screenshots.spec.js`
   - "is the variation actually live?": `node tests/assert-style-applied.mjs` with `DIRTBAG_STYLE` — run this first when a per-style result looks suspiciously like the default

   The command sandbox blocks `localhost`; run unsandboxed or via a browser MCP.
2. **In-session browser MCP** — interactive navigation / clicks / form-fill / screenshots that need `localhost`.
3. **Visible Chrome required** — cases headless can't reproduce, notably the Chrome float-bug repro (`docs/repro/`). Use a visible-browser MCP or hand off; never run them headless.
4. **Handoff** — only when 1–3 can't: `claude-playwright` / `claude-browser-handoff`.

### Still manual / needs eyes

The style-sticking guard and per-style screenshots above are now automated (tier 1). These still need a browser/human (tier 2–3):

- Mobile navigation overlay open/close, focus trap (Esc), and the skip link by keyboard.
- Small-viewport visual review at `240×320`, `320×240`, `360×640` (the screenshot script captures desktop; small-viewport captures + human review still apply).
- Stale hover / active-nav colours in the **Site Editor preview** when switching variations — the `sticking.spec.js` guard covers the *server-rendered front end*; the editor's live preview is a separate, visible-browser check.

## Accessibility checks

Run manual and automated checks:

- Keyboard-only navigation.
- Visible focus on links, buttons, forms, navigation, comments, and search.
- Skip link reaches main content.
- Heading order is sensible on key templates.
- Images have useful alt text when they convey information.
- Form labels are visible or programmatically available.
- Axe or pa11y pass in a browser-capable session.

## Optional external checks

Before each WordPress.org release or static-demo refresh:

- WordPress Theme Check plugin.
- W3C/Nu HTML validation on rendered pages.
- Feed validation for RSS feeds.
- Link check for docs, credits, and site demo content.
