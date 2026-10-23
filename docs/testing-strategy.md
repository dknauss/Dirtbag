# Testing strategy

Dirtbag is a deliberately small, mostly *declarative* block theme: `theme.json`,
templates, template parts, patterns, and style variations. `functions.php` exists
but is thin — two render filters, the colour-scheme derivation, and the
global-styles CSS guard — so there is very little imperative logic. That shapes
how we test.

## Focus: accessibility and UX

Dirtbag's quality bar is **accessibility and user experience**, verified in a real
browser. The static gate (`package-check`) keeps the package *valid*, but it cannot
tell you whether the page is *usable* — that is what the Playwright + browser layer
is for, and it is where the testing effort concentrates:

- **Accessibility** — axe (WCAG 2.1 A/AA) across page types *and* across every style
  variation (the dark themes — Terminal, Amber CRT, Blueprint — need contrast
  checks), heading order, landmarks, the skip link, and the navigation overlay's
  focus behaviour.
- **UX** — keyboard reachability and visible focus, the mobile overlay (open / close
  / Esc / focus trap), the search and comment forms, and that the core enhancements
  (pagination, lightbox) degrade to a usable document with JavaScript off.

Everything below supports that focus.

## Is TDD overkill here? Mostly yes.

Test-Driven Development (red → green → refactor) is the right default for business
logic, parsing, formatting, validation, and data transformations. Dirtbag has
almost none of that on the front end — the artifact is configuration and markup,
not functions. You cannot meaningfully write `expect(fn(input)).toBe(output)` for a
`theme.json` colour or a template's block markup.

So Dirtbag does **not** practise test-first TDD for its declarative core. Instead it
uses a **calibrated pyramid** weighted toward fast static/structural checks and
real-render verification. TDD is reserved for the small islands of actual logic
(Level 6).

## The pyramid

### 1. Static / structural checks — `bin/package-check` (primary gate)
Dependency-free, fast, runs locally and in CI on every push/PR. Validates required
files, JSON validity (`theme.json`, styles, blueprints), block-nesting and
delimiter integrity, screenshot dimensions, package hygiene, a suspicious-code
scan, bundled-asset rules, PHP `-l` syntax, the `dirtbag` i18n text domain,
reconcile guardrails, and seed-content integrity. This is the **source of truth for
"green"** and the right primary layer for a declarative theme — it checks
structure, not behaviour.

### 2. Schema validation
`theme.json` and each `styles/*.json` declare a `$schema` and must parse and match
the targeted WordPress version. (Covered today by package-check's JSON validity;
tighten toward full schema validation as needed.)

### 3. Render + accessibility (Playwright E2E)
Boot WordPress (Playground or Studio), assert key page types return 200, that
landmarks / headings / skip link exist, and run axe against seeded content. Lives in
`tests/`. Axe findings are report-only today; graduate the agreed rule set to
**gating** as they are cleared.

### 4. Theme Check (WordPress.org)
The domain-specific linter, run against the **release zip** — not the dev tree,
which contains `export-ignore`d dev directories. Release gate: **0 required**.
Recommended / Info items are triaged and documented.

### 5. Manual browser QA (release gate)
Human judgment automation can't cheaply cover, from a browser-capable session:
keyboard / focus order, the mobile navigation overlay (open / close / focus trap /
Esc), JavaScript-off fallbacks for the core enhancements (overlay, pagination,
lightbox), style-variation switching (no sticky CSS), small-viewport screenshots,
and screen-reader spot checks. Checklist lives in `docs/backlog.md` (Release QA).

### 6. TDD — only the islands of real logic
When actual logic is added, write the failing test first:

- the colour-scheme derivation in `functions.php` — `dirtbag_relative_luminance()`
  and `dirtbag_color_scheme_for()` are pure functions, unit-tested in
  `tests/php/color-scheme-test.php` (dependency-free plain PHP, no PHPUnit; run
  by `bin/package-check`),
- changes to `playground/seed-content.php` (the importer),
- new `bin/package-check` checks,
- any future Interactivity API directive or tiny vanilla JavaScript (Phase 4 v2).

Because the pre-commit gate rejects failing commits, the RED step lives in the
working tree and the test + implementation land as one GREEN commit (per the global
TDD-with-gates rule).

## What each roadmap phase leans on

| Phase | Primary verification |
|---|---|
| 1 — Repo & package checks | Levels 1–2 (package-check + CI) |
| 2 — Browser & .org review | Levels 3–5 (E2E, Theme Check, manual QA) |
| 3 — Release packaging | Level 1 on the zip + Level 4 + clean-install (Playground / throwaway Studio) |
| 4 — Interactivity (Preact) | Level 6 (TDD for any directive/JS) + Level 3 (JS-off fallback E2E) |
| 5 — SEO & structure | Levels 3 + 5 (render/structure assertions + manual) |
| 6 — Educational | Plain-language / readability review of docs; Level 1 keeps assets export-ignored |

## Implementation plan (Playwright + browser)

Built on the existing `tests/` harness (Playwright + `@axe-core/playwright`, booting
Playground via `tests/blueprint.json`). Specs are authored to run in a
browser-capable session (e.g. `claude-playwright`) or CI; a plain CLI session can't
execute browsers, so authored specs are validated when first run there.

**Spec files**

- `tests/e2e/site.spec.js` *(exists)* — smoke: page types return 200, the 404
  template, front-page sticky feature, archive lists, search form.
- `tests/e2e/accessibility.spec.js` *(new)* — axe (`wcag2a`, `wcag2aa`) on `/`, a
  single post, a page, an archive, search, and 404; one `<h1>` with ordered
  headings; `header` / `main` / `footer` landmarks and a labelled `nav`; skip-link
  target.
- `tests/e2e/ux-keyboard.spec.js` *(new)* — Tab order reaches skip link → nav →
  main; the mobile navigation overlay opens from the menu button, closes via its
  close button and `Esc`, and traps focus while open; search and comment forms are
  keyboard-operable; focus is visible.
- `tests/e2e/js-off.spec.js` *(new)* — a `javaScriptEnabled: false` project: query
  pagination still navigates (real links), images stay plain `<img>` (lightbox
  absent, no dead control), and the nav menu is still reachable.

**axe gating policy** — the high-confidence set is now **gating** (a regression
fails the suite): `image-alt`, `link-name`, `label`, `heading-order`,
`landmark-unique`, `region`, `color-contrast`, and `button-name`, enforced in
`accessibility.spec.js` across the seeded pages plus a single post and the 404
template; `color-contrast` is additionally gated across every style by the per-style
sweep below. The scan runs `wcag2a`, `wcag2aa`, **and `best-practice`** tags —
`heading-order`, `landmark-unique`, and `region` are best-practice rules, so without
that tag they would not be evaluated and gating them would be a silent no-op. Other
axe findings stay report-only until likewise confirmed clean; track the gated set
here as it grows. (`skip-link` is covered separately by a dedicated structural test
for the skip-link target.)
The graduation was unblocked by one finding: the first browser run (WP 7.0, seeded
Studio site) surfaced a `button-name` on `/about/` — the h-card avatar (a decorative
96px icon, `alt=""`) inherited the theme-wide image lightbox, so core rendered an
unnamed `.lightbox-trigger` "enlarge" button (its accessible name binds from the
Interactivity API and resolved to null). Fixed by disabling the lightbox on that one
decorative block (`"lightbox":{"enabled":false}` in `patterns/h-card-profile.php` and
the seeded About page) — a 96px icon should not be enlargeable.

`region` stays gated for a second reason worth recording, because the obvious
"fix" is the wrong one. From 2026-08-02 until #131 landed on 2026-08-24, the
`e2e` job failed on `/` with `region [1]` while the same suite was green
locally and the per-style sweep passed. The markup was never at fault:
`tests/blueprint.json` sets `WP_DEBUG_DISPLAY` (added so a boot fatal names
itself in the captured response body), and the Playground CLI intermittently
corrupts its own SQLite database under its worker pool (`database disk image is
malformed`). A failing query then reaches `wpdb::print_error()`, which echoes
`<div id="error">` *ahead of the doctype* — the HTML parser lands it in
`<body>` outside every landmark, and axe correctly reports one node with no
landmark. The boot gate did not catch it because a partly corrupt database
still satisfied the featured-image and author probes. Reproduced locally by
booting `tests/blueprint.ci.json` with an extra mu-plugin that fails one query
during `render_block`: axe returned exactly `region [1]`, target `#error`, and
nothing else — the CI failure in full.

What actually cured the red run was **#131**, not the gate below: waiting for
the CLI's own ready signal before probing, and pinning `--workers=6`, removed
the race at its source. `e2e` has been green on `main` from `5fbb383`
(2026-08-24) onward, before any of the harness changes in #139 existed.

#139 is therefore a **backstop**, not the cure — it exists so that a recurrence
fails where it belongs instead of arriving disguised as an accessibility
regression:

- `.github/workflows/e2e.yml` adds `no-php-errors` to both boot gates, so a page
  carrying rendered PHP/database error output is a *failed boot* and retries
  instead of running the suite against a broken site. The abort message and the
  probe line name the condition, and the diagnostics grep the body for it.
- `accessibility.spec.js` checks for that output before running axe, so the
  failure reads as a broken Playground boot rather than an a11y regression, and
  gated violations now print their selectors and markup — the HTML report
  artifact expires after 7 days, so the log line has to carry the evidence.

The gate has never fired in CI. Every run since #131 reports `seeded after
attempt 1`, so `no-php-errors` has only ever been satisfied trivially; its
correctness rests on the local reproduction above, not on any CI evidence. A
probe line reading `no-php-errors=no` is the signal that the race is still live.

Do not add `region` (or any rule) to the ignore list to clear a red run without
first establishing what the node is. Here the rule was right and the environment
was broken.

**Per-style accessibility sweep** *(implemented)* — contrast and focus visibility
differ per variation. `tests/axe-styles.sh` (`npm run test:styles` in `tests/`)
applies each variation via `playground/apply-style.php` (sets the active user global
styles post, then restores `default` on exit), and re-runs `tests/styles/
a11y-styles.spec.js` against the seeded pages for each. The active variation is
global site state, so the sweep is sequential. First run: **all seven styles
(default + the six variations, including the dark Terminal / Amber CRT / Blueprint
themes) report zero `color-contrast` violations** on every seeded page, and
`color-contrast` is now **gated** in `a11y-styles.spec.js`. Locally the sweep defaults
to the Studio site (override `DIRTBAG_WP_CLI` for a different WP-CLI). In CI it runs
as the `e2e-styles` matrix job: Playground is in-memory with no persistent wp-cli, so
each style gets its own boot and the variation is applied at boot via
`tests/ci-style-blueprint.mjs` (which appends an `apply-style.php` step to the
blueprint) rather than the sequential local loop.

Both appliers verify their own effect, through the shared
`playground/global-styles-post.php`: they link the global-styles post to the active
theme's `wp_theme` term (WP-CLI runs with no current user, so core's own `tax_input`
is silently dropped) and exit non-zero unless the post they wrote is the one the front
end's lookup returns. Without that, a failed activation is indistinguishable from a
passing sweep — every spec would keep scanning whatever variation was already active.

**Self-switching specs** — two specs in `tests/styles/` drive the applier themselves
rather than being driven by it, so they are tagged `@self-switching` and
`axe-styles.sh` excludes them from its per-style loop (they would otherwise fight it
for the active variation). Both are local-Studio only and self-skip elsewhere:
`sticking.spec.js` (`npm run test:styles:sticking`) for the A→B→A style switch, and
`additional-css.spec.js` (`npm run test:styles:additional-css`), which adds user
Additional CSS the way the Site Editor panel does and asserts that theme.json's root
`styles.css` still reaches the page. See [development.md](development.md) → "Why root
`styles.css` needs a guard".

Because they mutate global styles directly rather than through `axe-styles.sh`, they
carry their own copy of its checkout guard: `assertThemeCheckout()` before the first
write, and again before the `afterAll` restore, so an abort against a foreign
checkout cannot write to somebody else's site on the way out.

**Viewports** — run the keyboard/overlay specs at a mobile width (360×640) and a
desktop width; add small-viewport screenshot review (240×320, 320×240, 360×640) to
the manual checklist.

**Manual gate (release)** — screen-reader spot checks, a real-keyboard pass, and the
style-switcher regression (no sticky CSS) stay human-run; see `backlog.md` Release
QA.

**Verification discipline** — when these run against a seeded site, treat the
seed/export with suspicion: a raw Site-Editor export can reintroduce artifacts the
reconcile strips, so `package-check` (seed integrity + reconcile guardrails) runs
*first* and the e2e suite second.

## Principles

- The deterministic gate (package-check + CI) owns "green"; reviewers and humans own
  judgment — correctness, accessibility, design, and voice.
- Scale effort to the change: a doc typo is not a test event; a new core enhancement
  needs a JavaScript-off fallback test.
- Keep the test tooling dependency-free and no-build wherever possible, matching the
  theme's ethos.

See also: [Testing guide](testing.md) (how to run things) and
[Backlog](backlog.md) (the manual Release QA checklist).


### CI runtime and variation verification (#120, #122)

Both browser jobs read `preferredVersions` from `tests/blueprint.json` and pass
explicit `--wp` and `--php` flags to the pinned Playground CLI. Numeric major/minor
pins allow patch releases in that family. Before Playwright runs,
`tests/assert-ci-state.mjs` requests a CI-only endpoint from the serving PHP runtime
and checks its actual WordPress/PHP versions before and after the suite. A CLI
banner is not the evidence. Automatic updates and request-triggered WP-Cron are
disabled in this disposable site: an intermediate pinned-runtime run served
scheduled-maintenance pages during browser tests. The state guard requires both
constants so an update cannot silently change the target during a run.

The generated blueprint installs `tests/ci-state.php` as a temporary mu-plugin in
the disposable site. It is not part of the theme release. The endpoint reports the
live global-styles post, theme linkage, saved payload, and completed-apply receipt.
The trusted setup runs as the sandbox administrator: unauthenticated saves invoke
KSES and remove variation settings. No security filters are disabled.
The guard compares the saved settings/styles with the requested source variation;
a success receipt alone is insufficient. For `default`, the blueprint first applies
Terminal, then resets to an empty user layer. A skipped reset leaves the wrong
receipt or payload and fails, even though default-looking CSS alone could pass.

The per-style suite also checks the browser's body background, head colour metadata,
and truck-icon CSS custom property/computed filter. The metadata and truck tests now
run in CI instead of skipping there. `node --test tests/ci-state.test.mjs` proves the
guard rejects wrong runtime versions, missing resets, mismatched payloads, orphaned
posts, and a front-end post different from the recorded applied post.


### Shared Playground boot and diagnostics (#128)

Both E2E jobs call [the same runner](../.github/scripts/boot-playground.sh):

```sh
bash .github/scripts/boot-playground.sh tests/blueprint.ci.json 7.0 8.2
```

The workflow supplies the versions from `tests/ci-versions.mjs`; the generated
blueprint already includes the requested style. The runner needs Bash, Node/npm,
Python 3 and curl, available on the Ubuntu CI runner. It uses port 9400 by default;
`DIRTBAG_BOOT_PORT` selects another free port for isolated local tests. It waits for the CLI's
`Ready!` signal before sending requests, then requires all four readiness probes:
the theme stylesheet, a seeded featured image, the published author slug in the
public REST collection, and no rendered PHP/database errors. These are boot/seed
checks; the separate before/after runtime and saved-style guard proves the target
versions and applied style.

`published-author-slug` is intentionally a **visibility** check. The public users
collection depends on published posts; a missing slug alone does not prove a user
identity write failed. The seed's identity read-back assertions and the browser's
`link-name` checks cover the actual identity/markup concerns. Inspect those results
before changing user seeding.

Inside Playground PHP, use `dirtbag_playground_stderr()` from
[`playground/stderr.php`](../playground/stderr.php). It writes to `php://stderr`,
which reaches the captured server log under both CLI and web SAPIs. Do not use the
CLI-only `STDERR` constant. `error_log()` is only the helper's fallback; its output
has not reliably appeared in Playground CI logs.

On failure, inspect the named probe values, HTTP status, response excerpt,
rendered PHP errors and server-log tail in the job log. Full per-attempt `.log`,
`.probe` and `.home` files are retained under
`${RUNNER_TEMP}/dirtbag-playground` and included in the failure artifact, alongside
Playwright test context. `DIRTBAG_BOOT_LOG_DIR` overrides this directory for
isolated tests. A missing CLI ready signal, missing seed content, wrong runtime,
and an axe violation are different failures; diagnose the first failing layer.

Retries remain bounded to three launches. Each starts a fresh CLI process in its
own session; failure cleanup terminates that process group and its workers,
without killing other Playground instances by name or arbitrary processes on a
port. Probe/body files are cleared per attempt, so diagnostics cannot reuse an
old response. The historical later-retry/WAL theory was not established and is
not a reason to add database resets or weaken checks. Reopen it only with a new
reproduction and the retained per-attempt evidence.

`node --test tests/boot-playground.test.mjs` exercises the actual shell runner with
deterministic CLI/HTTP substitutes: success with explicit version flags, a missing
theme despite passing content probes, rendered PHP errors, CLI death, and recovery
after an owned failed process is stopped. The full CI matrix exercises real
Playground boots and browsers.
