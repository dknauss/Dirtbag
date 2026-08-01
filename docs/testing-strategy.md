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
sweep below — a claim that was **vacuous in CI until the apply bug described there
was fixed**. The scan runs `wcag2a`, `wcag2aa`, **and `best-practice`** tags —
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

**The CI matrix scanned the default style seven times** *(fixed)* — worth recording,
because the failure was invisible by construction. `playground/apply-style.php` resolved
its target through `WP_Theme_JSON_Resolver::get_user_global_styles_post_id()`, which
creates the `wp_global_styles` post via `wp_insert_post()` with the theme's `wp_theme`
term in `tax_input`. `wp_insert_post()` silently drops `tax_input` unless the current
user can assign the taxonomy's terms — and a Playground `runPHP` boot step has no user
at all. The post was created without its term, the helper still returned its ID, the
write succeeded, and every reader (including the front end) then filtered on that
missing term, found nothing, and fell back to theme.json. A Playground `runPHP` step
swallows STDOUT, STDERR and the exit code, so nothing surfaced. Every leg of the matrix
rendered `default` while reporting per-style coverage, which made this document's claim
that `color-contrast` was "gated across every style" in CI vacuous for as long as it
stood.

A second, independent bug was hiding behind the first. Core registers
`wp_filter_global_styles_post()` on `content_save_pre` for anyone who cannot
`unfiltered_html` — which a Playground boot step and a plain `wp eval-file` both are.
That filter runs the payload through `WP_Theme_JSON::remove_insecure_properties()`,
whose settings pass keeps only presets and typed `VALID_SETTINGS` entries, so the
free-form `settings.custom` tree was stripped *before it reached the database*.
`styles` survived, `settings` did not — which is why the background applied while
`settings.custom.dirtbag.truckIconFilter` stayed at theme.json's `none`, and why
`truck-icon.spec.js` carried a CI skip blaming Playground for "not re-emitting" it.
`apply-style.php` now drops that one filter for its own write and restores it
immediately: the payload is the theme's own `styles/<slug>.json`, and the file never
ships.

Four things now prevent a silent repeat:

1. `apply-style.php` attaches the `wp_theme` term itself (`wp_set_object_terms()` has no
   capability gate, and the shared `global-styles-post.php` does this for both appliers),
   then **verifies its own write** — WordPress must resolve back to the post it wrote, and
   both the merged background *and* the merged `truckIconFilter` must match the variation.
   It aborts by throwing, because that is the only failure mode a `runPHP` step actually
   propagates: STDOUT, STDERR and the exit code are all swallowed there, and `STDERR` is a
   CLI-SAPI constant that is not even defined.
2. `tests/assert-style-applied.mjs` checks the *rendered* page — the one thing that cannot
   lie about which variation is live — against both layers: `styles.color.background` and
   the `--wp--custom--dirtbag--truck-icon-filter` custom property. They reach the front end
   by different routes and have failed independently, so one passing does not imply the
   other. It is both part of the CI boot readiness check (so a bad boot retries) and a
   standalone gate before the sweep runs.
3. The blueprint now applies on every slug including `default`, so all seven matrix legs
   exercise the same path and a failed apply is never mistaken for a correct default.
4. `head-meta.spec.js` and `truck-icon.spec.js` no longer skip in CI. Both were skipped for
   diagnoses that turned out to be wrong; between them they assert each layer per style.

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
