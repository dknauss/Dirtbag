# Dirtbag State

_Last refreshed: 2026-08-23._

## Project Reference

See: `.planning/PROJECT.md`.

**Core value:** A Dirtbag site must remain readable, navigable, and understandable with WordPress core blocks, native browser behaviour, and minimal theme machinery.

**Current focus:** Post-0.1.17 maintenance and release hardening. Phase 7 — Educational build remains prepped and **on hold** pending go-ahead; see [`phase-6/BUILD-KICKOFF.md`](phase-6/BUILD-KICKOFF.md).

## Current Status

- **Published and released.** Dirtbag is accepted in the WordPress.org theme directory. The current tagged release and WordPress readme stable tag are **0.1.17** (`v0.1.17`, 2026-07-03).
- **Unreleased work accumulated.** `main` is 14 commits ahead of `v0.1.17`. The unreleased changelog covers active-style head metadata, protection for the theme's root CSS when users add Additional CSS, Playground/style-application diagnostics and fixes, and print styles with per-variation coverage.
- **Static gate is green.** `bin/package-check` passed locally on 2026-08-23, including package hygiene, JSON and block integrity, i18n, PHP syntax, 36 colour-scheme assertions, and 9 seed-diagnostics assertions.
- **Browser coverage is green on the CI fix.** The 2026-08-23 `main` E2E run passed the main suite and six style legs; the Minimalist leg hit an SQLite `Database Error` before Playwright could run, and an isolated rerun failed the same way on all three boot attempts. PR #131 now waits for Playground's own ready signal before the readiness probes can race its SQLite seed writes, and pins six request workers because the CLI warns that its three-worker default on GitHub's four-CPU runners increases file-lock deadlock risk. Its first complete GitHub run passed the main E2E suite and all seven style legs; local confirmation passed all 56 main tests and all 28 applicable Minimalist tests (4 self-switching tests intentionally skipped). Continue tracking residual reliability work in GitHub issues #99 and #128.
- **Phase 7 (Educational build) is HELD.** No `docs/learn/` lesson content has been written. The build order and guardrails remain in [`phase-6/BUILD-KICKOFF.md`](phase-6/BUILD-KICKOFF.md) and the roadmap.

## Release Posture

The unreleased changes are a reasonable **0.1.18 candidate**, but not ready to publish yet. Before release:

1. Merge PR #131 and confirm its green E2E result holds on `main`.
2. Build the release zip and run a fresh Theme Check against the unreleased package.
3. Perform the documented manual browser/style-switching QA.
4. Move the Unreleased changelog into a dated 0.1.18 section and bump `style.css`, `readme.txt`, and POT metadata together.
5. Refresh the pinned Playground demo bundle and verify the release asset.

Do not tag or upload 0.1.18 until those gates are complete.

## Last Known Checks

- `bin/package-check`: green locally on 2026-08-23.
- Main Playwright smoke + accessibility suite: green in GitHub Actions run `32679923630`.
- PR #131 GitHub Actions run `32681999331`: main E2E and all seven per-style legs green.
- Local confirmation with the revised harness: 56 main tests passed; exact Minimalist blueprint passed 28 tests with 4 self-switching tests intentionally skipped.
- Latest completed Theme Check evidence remains the 0.1.17 release; the unreleased package still needs a fresh pass.

## Accumulated Context

### Phase 6 — Educational research (planning complete)

All five research/planning deliverables are done and merged (PR #28). Build is held — see [`phase-6/BUILD-KICKOFF.md`](phase-6/BUILD-KICKOFF.md).

- `.planning/phase-6/PERSONAS-AND-OBJECTIVES.md` — two primary personas (Tinker, Wrench), two secondary (Beacon, Sprout), and learning objectives LO-1…LO-8.
- `.planning/phase-6/TEACHABLE-SURFACES-AUDIT.md` — docs/seed/patterns/package-check mapped to objectives, with the gap analysis.
- `.planning/phase-6/CONTENT-HOME-DECISION.md` — decided: hybrid `docs/` + seed demo surfaced via a Playground blueprint; nothing new ships in the package; patterns stay silent in-package and get annotated in `docs/`.
- `.planning/phase-6/LEARNING-PATH-STRUCTURE.md` — the "Garage" path: four stages (On the lot → Under the hood → The honest machine → Build your own), every LO assigned a home + disposition (reframe/annotate/point-at/write-new), a `docs/learn/` tree, and a build order.
- `.planning/phase-6/WRITING-GUIDELINES.md` — plain-language + accessibility rules tied to `readability-check` (nine categories, Flesch 60–70 target for path prose), per-persona altitude map, canonical-terms table, and the authoring gate.

### Open Work Snapshot

- GitHub: 10 open issues and 4 open pull requests as of 2026-08-23.
- Local planning todos:
  - `.planning/todos/pending/2026-06-18-private-note-tool.md`
  - `.planning/todos/pending/2026-06-23-wptexturize-opening-tag-core-solution.md`
  - `.planning/todos/pending/2026-06-23-wptexturize-primes-limits.md`
