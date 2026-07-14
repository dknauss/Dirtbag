# Gutenberg #79372 — Post Title link is `inline-block`, breaking float / `shape-outside` wrapping

**Status:** PR open — [WordPress/gutenberg#80231](https://github.com/WordPress/gutenberg/pull/80231)
(opened 2026-07-14). The archaeology comment was posted 2026-07-04; a contributor
confirmed the editor-scoping direction on 2026-07-09 and invited the PR. The patch
below is what was submitted. Reserve/local fallback (theme-side float variant) stays
in place until the PR merges.

- Issue: <https://github.com/WordPress/gutenberg/issues/79372> — triaged `[Type] Bug`
  / `[Block] Post Title`, filed 2026-06-22.
- PR: <https://github.com/WordPress/gutenberg/pull/80231> — branch
  `fix/post-title-link-inline-block-float` on `dknauss/gutenberg`.
- Patch: [`gutenberg-79372-post-title-inline-float.patch`](gutenberg-79372-post-title-inline-float.patch)
- Filed issue text (source of record): [`gutenberg-issue-draft.md`](gutenberg-issue-draft.md)
- Repro: [`chrome-float-repro.html`](chrome-float-repro.html) and
  [`../sidebar-thumbnail-layout.md`](../sidebar-thumbnail-layout.md)
- Theme-side workaround already shipped: a float style variant scopes the title link
  back to `display: inline`
  (`.sidebar-content:not(.is-grid) .sidebar-entry > .wp-block-post-title :where(a)`).

## The problem

Core styles the link inside the Post Title block as an atomic inline box:

```scss
// packages/block-library/src/post-title/style.scss → .wp-block-post-title :where(a)
:where(a) { display: inline-block; }
```

An `inline-block` is an atomic inline-level box: its contents may wrap internally, but
the box itself cannot split across the separate line boxes a float creates beside and
below it. So a linked Post Title flowing around a `float` (or `shape-outside`) **drops
whole below the float** the moment it is too wide for the line box beside it, instead
of wrapping its text beside and under the float. A plain inline link wraps correctly.
This is spec-correct CSS, not a browser bug — it reproduces in any engine (including
headless Chrome) at a narrow-enough column.

## Why the `inline-block` is there — and why the front end doesn't need it

Archaeology on `post-title/style.scss` (2026-07-04):

- The `display: inline-block` on the link was introduced by
  [#30666](https://github.com/WordPress/gutenberg/pull/30666) (2021-04-13),
  *"Fix Post Title warnings for RichText in inline containers."* Its **sole** purpose
  is to silence the editor warning *"RichText cannot be used with an inline
  container"* — an **editor-only** concern (`RichText` is the block editor's editable
  component; it does not exist on the front end).
- [#43457](https://github.com/WordPress/gutenberg/pull/43457) added padding support,
  but the padding / `box-sizing: border-box` it introduced apply to the
  `.wp-block-post-title` **wrapper**, not to the `<a>`. The link's `inline-block` is
  unrelated to padding.
- [#64911](https://github.com/WordPress/gutenberg/pull/64911) and
  [#65307](https://github.com/WordPress/gutenberg/pull/65307) added and then
  consolidated the `font-*: inherit` rules on the link (so a linked title inherits the
  block's typography). Those `inherit` rules are load-bearing; the `display` line just
  rode along into the consolidated `:where(a)` block.

The rule lives in `style.scss`, which loads on **both** the editor and the front end.
So an editor-only requirement is silently constraining every front-end theme that
wants a magazine-style float beside a post title.

## The fix

Make `display: inline-block` **editor-only**. On the front end the link becomes a
normal `inline` link and wraps around floats; in the editor the RichText warning stays
silenced. Nothing else about the block changes — typography inherits, wrapper padding,
and `box-sizing` are untouched.

The patch does three things:

1. `post-title/style.scss` — remove `display: inline-block;` from `:where(a)` (front
   end + editor no longer forces it via the shared stylesheet).
2. `post-title/editor.scss` (**new**) — re-add `display: inline-block` on the link,
   with a comment pointing at #30666 and #79372. Editor styles load only in the
   editor.
3. `block-library/src/editor.scss` — `@use "./post-title/editor.scss"` so the new
   partial is compiled into the aggregated editor bundle (the block-library
   convention; post-title's `block.json` needs no `editorStyle` key because editor
   partials are aggregated here, not registered per block).

## Verifying

CSS-only change; no unit test harness. Verify by observation:

- **Editor** — add a Post Title block, enable *Make title a link*, open the browser
  console: the *"RichText cannot be used with an inline container"* warning must
  **not** reappear. (Confirms the editor.scss rule is loading.)
- **Front end** — render a linked Post Title beside a floated element in a narrow
  column (the [`chrome-float-repro.html`](chrome-float-repro.html) matrix, or a real
  Dirtbag sidebar entry). The title text must wrap **beside and under** the float, not
  drop whole below it. Inspect the link: computed `display` is `inline`, not
  `inline-block`.
- **No regression** — a normal (wide-column) linked title looks identical to before;
  wrapper padding and typography are unchanged.

## Turning this into a PR (when ready)

1. `git clone https://github.com/WordPress/gutenberg && cd gutenberg && npm ci`
2. `git apply ../dirtbag/docs/repro/gutenberg-79372-post-title-inline-float.patch`
   (rooted at the repo top, `a/packages/...`; creates `post-title/editor.scss`).
3. `npm run build:package-types` is not needed; rebuild styles / run the editor to
   verify per **Verifying** above.
4. Open the PR against `trunk`, referencing #79372, summarising: *"Post Title: keep
   the title-link `inline-block` in editor styles only, so the front-end link can wrap
   around floats / `shape-outside`."* Explain the #30666 origin so reviewers see the
   editor warning is preserved.
5. No self-prop; credit per the project's contributor-attribution norms.

## Before opening a PR — consider commenting first

Unlike #79380 (an unambiguous a11y fix), this touches a decision core made
deliberately, so the highest-value first step may be to **post the archaeology above
as a comment on #79372** — the #30666 origin, that the constraint is editor-only, and
the proposed editor-scoped fix — and let a maintainer confirm the direction before a
PR. The issue was filed as a question (*"Is `display: inline-block` load-bearing?"*);
this answers it. If a maintainer prefers to keep the runtime constraint or fix it
differently, the theme-side float variant stays as the local fix and this patch is
retired.
