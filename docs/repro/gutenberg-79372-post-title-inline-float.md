# Gutenberg #79372 — Post Title link is `inline-block`, breaking float / `shape-outside` wrapping

**Status (2026-09-27):** **merged upstream.** [WordPress/gutenberg#80231](https://github.com/WordPress/gutenberg/pull/80231)
was approved by youknowriad and merged 2026-09-16 as `2a2d71d9b`, closing #79372.
First tagged in `v24.1.0-rc.1`, so it ships in Gutenberg 24.1.0 — not in 24.0.0,
which was released the same day from an earlier branch point.

- Issue: <https://github.com/WordPress/gutenberg/issues/79372> — `[Type] Bug` /
  `[Block] Post Title`, closed 2026-09-16 by the merge.
- PR: <https://github.com/WordPress/gutenberg/pull/80231> — *Post Title: remove the
  inline-block from the title link*, merged 2026-09-16.
- Patch (current): [`gutenberg-79372-post-title-inline-float.patch`](gutenberg-79372-post-title-inline-float.patch)
- Evidence from the 2026-09-15 verification: [`gutenberg-79372/`](gutenberg-79372/)
- Repro: [`chrome-float-repro.html`](chrome-float-repro.html) and
  [`../sidebar-thumbnail-layout.md`](../sidebar-thumbnail-layout.md)
- Theme-side workaround shipped in Dirtbag: a float style variant scopes the title
  link back to `display: inline`.

## The problem

Core styles the link inside the Post Title block as an atomic inline box:

```scss
// packages/block-library/src/post-title/style.scss → .wp-block-post-title :where(a)
:where(a) { display: inline-block; }
```

An `inline-block` is an atomic inline-level box: its contents may wrap internally, but
the box itself cannot split across the separate line boxes a float creates beside and
below it. So a linked Post Title flowing around a `float` (or `shape-outside`) **drops
whole below the float**, instead of wrapping its text beside and under it. A plain
inline link wraps correctly. This is spec-correct CSS, not a browser bug.

## Why the rule exists — and why nothing needs it now

Archaeology, corrected 2026-09-15. The first pass (2026-07-04) concluded the
`inline-block` was an editor-only requirement, and PR #80231 originally moved it into
an editor stylesheet. **That premise was stale:**

- [#30666](https://github.com/WordPress/gutenberg/pull/30666) (2021-04-13) added the
  rule to silence the editor warning *"RichText cannot be used with an inline
  container."*
- [#32013](https://github.com/WordPress/gutenberg/pull/32013) (2021-05-21, ellatrix)
  **removed that warning entirely** — `use-inline-warning.js` deleted — after finding
  the original problem no longer reproduced in Chrome, Firefox or Safari. The same PR
  stripped the matching `display: inline-block` workarounds from **Site Title, File,
  and Query Pagination Next/Previous**. Post Title's copy was missed because it lives
  in `style.scss` rather than in the block's edit code. Riad reviewed that PR.
- [#43457](https://github.com/WordPress/gutenberg/pull/43457) applies padding /
  `box-sizing: border-box` to the `.wp-block-post-title` **wrapper**, not the `<a>`.
- [#64911](https://github.com/WordPress/gutenberg/pull/64911) /
  [#65307](https://github.com/WordPress/gutenberg/pull/65307) added the `font-*:
  inherit` rules on the link. Those are load-bearing; the `display` line merely rode
  along into the same `:where(a)` block.

On `trunk` today no inline-container warning exists anywhere in the rich-text sources,
and Site Title edits an `<a>` inline with no `inline-block` in editor or front end.
The rule has been vestigial since May 2021.

## The fix

Delete `display: inline-block;` from `post-title/style.scss`. No editor stylesheet, so
the editor and front end stay identical — the same shape as #32013's Site Title change.

## Riad's review questions (2026-09-15) and the answers

> - Isn't this change going to create discrepancy between editor and frontend.
> - Do we expect this change to cause visual breaking changes in existing sites and themes?

### 1. Editor / front-end parity — verified, no discrepancy

Measured on a throwaway Studio site, **WordPress 7.1 + Twenty Twenty-Five**, Chromium
via Playwright, comparing core's `inline-block` against a simulated `inline` (a CSS
override, *not* a Gutenberg build). Scripts and raw results in
[`gutenberg-79372/`](gutenberg-79372/):

| check | `inline-block` (core) | `inline` (patched) |
| --- | --- | --- |
| linked title beside a float, front end | drops below the float | wraps beside it |
| same layout inside the editor canvas | drops below | wraps beside |
| type at end of title | ok | ok |
| select-all + delete to empty | ok, caret retained | ok, caret retained |
| type into the empty title | ok | ok |
| click back into an empty title | ok | ok |
| Backspace on an empty title (block survives) | ok | ok |
| console errors | none | none |

Editor and front end agree **in both modes**, so removing the rule does not introduce a
discrepancy. The empty-title placeholder box is 3px shorter with `inline` (23px vs
26px) and stays visible and clickable.

One caret test (click at the start of a wrapped title, press Home, type) failed on the
`inline-block` leg only — a test artifact: an `inline-block` reports a single client
rect for the whole wrapped title, so the synthetic click landed mid-title.

### 2. Visual breaking changes — small, and named

**Default theme:** Twenty Twenty-Five's home page renders **pixel-identical** before
and after at desktop (1280) and mobile (390) widths — every linked title keeps its
height and position; full-page screenshots hash-equal. Only the internal line-box count
changes (a wrapped title becomes several fragments instead of one box). The per-title
measurements are kept in `gutenberg-79372/home-baseline.json` and
`home-inline.json`; the four full-page PNGs behind the hash comparison were **not**
retained (their whole content was that the pair matched) — regenerate them by running
`pt-home-check.js` in both modes.

**Directory-wide scan** (veloria.dev, successor to wpdirectory.net; Go RE2 over every
wordpress.org theme's `.css`/`.scss`, `.min.css` excluded), raw output in
[`gutenberg-79372/theme-count.json`](gutenberg-79372/theme-count.json):

- 3,823 selector matches across 962 themes; **~900 themes** carry a real
  `.wp-block-post-title … a` rule.
- **2 themes** set something that genuinely behaves differently on an inline link:
  `escape-room-game` (`-webkit-line-clamp: 1`) and `writings` (`margin-bottom`).
  Neither is in the 50 most-installed matching themes.
- **10 more** set such a property but also set `display` on the link themselves, so
  core's value never applied to them.
- **32 themes** set `display` on the link at all (`inherit` 9, `-webkit-box` 7,
  `block` 6, `initial` 4, `inline` 4, `inline-block` 3, `none` 1).
- **~107 themes** use a hover underline drawn with `background-size: 100% Npx`. When a
  title wraps, that underline will paint under each line instead of once under the
  whole box.

**Scan caveats:** the search sees only ±5 lines of context, which left ~41 themes'
declaration blocks unread; it does not cover `theme.json` or styles printed from PHP.
So the "2 themes" figure is a floor, not a proof.

## Reproducing the verification

`gutenberg-79372/pt-inline-test.js` (editor + float) and
`gutenberg-79372/pt-home-check.js` (no-float home page) expect:

1. A scratch Studio site with two mu-plugins — one that logs in as user 1 from
   localhost, one that enqueues the float-test CSS through `enqueue_block_assets` and
   adds `.wp-block-post-title a{display:inline}` when option `pt_inline_mode` is
   `inline`.
2. A page holding a `core/group.pt-float-test` with a floated `div.pt-float`, a
   `core/post-title {"isLink":true}` and a paragraph.
3. Run each script twice, toggling `pt_inline_mode` between runs.

The site used on 2026-09-15 was deleted after the run; recreate with
`studio site create`. Chromium only — Firefox and WebKit were not installed, and
#32013's own testing covered all three engines.

## What was posted upstream

- Comment on #79372 correcting the archaeology and answering both questions:
  <https://github.com/WordPress/gutenberg/issues/79372#issuecomment-5690369413>
- PR #80231 retitled and rewritten; branch now carries the editor-scoping commit, the
  one-line removal, and a merge of `trunk` (the *Required changes from trunk* status
  needs the branch current). Net diff is the single deleted line.

## Lint status of the upstream commit

The commit on the PR branch was made with `--no-verify`. Gutenberg's pre-commit hook
runs `lint:css`, and that clone had no working `node_modules`, so the hook failed with
`wp-scripts: command not found` and reverted the staged change rather than checking it.
Upstream CI did not cover the gap either: none of the 69 checks on #80231 is a CSS lint
job — change detection skips those suites for a one-line `.scss` deletion.

**Checked afterwards, on 2026-09-15, and it passes.** With the repo's own toolchain
(Node 24.18.1 / npm 11.16.0 per `.nvmrc` and `devEngines`, full `npm ci`),
`npm run lint:css` — the same command the hook runs, suppressions file included —
exits 0 on the branch.

The negative control matters here, because a lint run that quietly matches no files
looks exactly like a clean pass:

- Injecting `cursor: pointer` (banned in `tools/stylelint/config.js`) produced **no**
  error. That rule does not fire on this file for reasons not chased down, so the
  first control was vacuous.
- Injecting `color: #FFFFFF` produced `@stylistic/color-hex-case` and
  `color-hex-length` errors at that line, exit 2, naming
  `packages/block-library/src/post-title/style.scss`.
- Restoring the file returns exit 0.

So the command does reach the changed file and does enforce rules on it. Standalone
stylelint 17 with `postcss-scss` also parses the file cleanly, though it cannot load
the repo's rules (they live in the `tools/stylelint` workspace package).

## Outcome

Merged 2026-09-16 as `2a2d71d9b`, approved by youknowriad — *"Thanks for the extensive
research. I appreciate it, it feels to me, this might be ready to ship."* Issue #79372
closed with the merge. The commit is in `v24.1.0-rc.1` and ships in Gutenberg 24.1.0.

The theme-side workaround (the float style variant scoping the title link back to
`display: inline`) is now redundant wherever the bundled Gutenberg is 24.1.0 or newer,
but it stays in place for older WordPress: core's own copy of the rule ships with the
WordPress release cycle, not with Gutenberg trunk.
