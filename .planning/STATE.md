# Dirtbag State

_Last refreshed: 2026-08-23._

## Project Reference

See: `.planning/PROJECT.md`.

**Core value:** A Dirtbag site must remain readable, navigable, and understandable with WordPress core blocks, native browser behaviour, and minimal theme machinery.

**Current focus:** Post-0.1.18 maintenance. Phase 7 — Educational build remains prepped and **on hold** pending go-ahead; see [`phase-6/BUILD-KICKOFF.md`](phase-6/BUILD-KICKOFF.md).

## Current Status

- **Published and released.** The current GitHub release and WordPress readme stable tag are **0.1.18** (`v0.1.18`, 2026-08-23). It ships active-style head metadata, protection for the theme's root CSS when users add Additional CSS, hardened Playground/style-application diagnostics, and print styles with per-variation coverage.
- **Static gate is green.** `bin/package-check` passed locally on 2026-08-23, including package hygiene, JSON and block integrity, i18n, PHP syntax, 36 colour-scheme assertions, and 9 seed-diagnostics assertions.
- **Browser coverage is green.** PR #133 passed the main E2E suite and all seven Playground style legs. Local WordPress Studio release QA passed 196 tests (28 across each of seven variations), including the Studio-only truck-icon custom-property checks. Continue tracking residual reliability work in GitHub issues #99 and #128.
- **Phase 7 (Educational build) is HELD.** No `docs/learn/` lesson content has been written. The build order and guardrails remain in [`phase-6/BUILD-KICKOFF.md`](phase-6/BUILD-KICKOFF.md) and the roadmap.

## Release Posture

Version **0.1.18 is released**. The exact 0.1.18 distribution ZIP passed all 6,660 Theme Check tests with only the two documented INFO notes. Manual small-viewport, mobile-navigation, Site Editor, and style-variation QA passed. The GitHub release contains verified clean-theme and Playground-demo ZIPs, and the pinned `playground-demo` asset now serves the same 0.1.18 demo bundle.

## Last Known Checks

- `bin/package-check`: green locally on 2026-08-23.
- Main Playwright smoke + accessibility suite: green in GitHub Actions run `32679923630`.
- PR #131 GitHub Actions runs `32681999331` and `32682180930`: main E2E and all seven per-style legs green twice.
- Post-merge `main` run `32682338552`: main E2E and all seven per-style legs green.
- Local confirmation with the revised harness: 56 main tests passed; exact Minimalist blueprint passed 28 tests with 4 self-switching tests intentionally skipped.
- PR #133 run `32683712592`: main E2E and all seven per-style legs green; both package-check runs green.
- Local WordPress Studio 0.1.18 release site: all 196 per-style tests passed, including the local-only truck-icon assertions.
- Theme Check on the exact 0.1.18 release ZIP: 6,660 tests passed; only the documented hard-coded sample-link and single-text-domain INFO notes remain.
- Release run `32684075335`: clean theme ZIP, Playground demo ZIP, and GitHub release published successfully. Downloaded asset digests match GitHub, and the pinned Playground bundle reports version 0.1.18.

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
