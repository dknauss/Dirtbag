# Reproductions

## Gutenberg Gallery caption overlay accessibility repro

[`gutenberg-gallery-caption-a11y-repro.html`](gutenberg-gallery-caption-a11y-repro.html)
is a minimal WordPress-free reduction of the current core Gallery overlay caption
problem Dirtbag works around: nested Gallery captions are absolutely positioned
over images with `overflow:auto`, which can produce an axe
`scrollable-region-focusable` finding when the caption exceeds the image tile.

Captured evidence lives in [`screenshots/`](screenshots/):

- `wp-free-core-overlay.png` / `wp-free-core-overlay-axe.json`
- `wp-free-dirtbag-fix.png` / `wp-free-dirtbag-fix-axe.json`
- `current-wp-core-overlay.png` / `current-wp-core-overlay-axe.json`
- `current-wp-dirtbag-fix.png` / `current-wp-dirtbag-fix-axe.json`
- `caption-repro-summary.json`

A supporting comment for the live upstream Gallery issue is not yet drafted — the
repro and axe evidence above are the raw material for it.

## Chrome float-in-grid below-the-fold repro

A minimal, **WordPress-free** reduction of the Dirtbag sidebar float failure
documented in [`../sidebar-thumbnail-layout.md`](../sidebar-thumbnail-layout.md):
when a floated thumbnail precedes a WordPress Post Title link, the title can stack
below the float instead of wrapping beside it.

The reduction found the missing trigger: WordPress core styles Post Title links as
`display: inline-block`. That atomic inline box cannot occupy the remaining line box
beside the 60px float when the title is too wide, so it drops below the float. A
float variant must override the title link back to `display: inline`; this is not a
clean Chromium filing as currently reduced.

Filed upstream as [WordPress/gutenberg#79372](https://github.com/WordPress/gutenberg/issues/79372)
(maintainer-triaged `[Type] Bug`). A held core fix — make the `inline-block`
editor-only so the front-end link wraps around floats — plus the archaeology behind
it lives in
[`gutenberg-79372-post-title-inline-float.md`](gutenberg-79372-post-title-inline-float.md)
and [`gutenberg-79372-post-title-inline-float.patch`](gutenberg-79372-post-title-inline-float.patch).

## How to run it (this matters)

The bug is **deterministic CSS, not browser-specific**. It reproduces wherever a
narrow-enough column forces a too-wide `inline-block` title link off the line beside
the float — **including in headless Chrome** (`stacked: 14/14` at `800 × 1200`). It
eluded the original investigation only because the live-page checks (our headless
*screenshots* and a quick Safari look) happened to be at *wider* widths where the
titles still fit.

1. Any Chromium browser, **headless or visible** (seen on Chrome 149.0.7827.156). The
   behaviour is spec-level float/`inline-block`, so Safari and Firefox should match at
   the same widths.
2. A **tall, narrow** viewport — `800 × 1200` is reliable. The column must be narrow
   enough that the longest title can't fit beside the 60px float.
3. **Look on first paint, before scrolling.** Scrolling forces the relayout that
   heals the bug.
4. Detection uses **title line-fragment rects** (`Range#getClientRects()`), not the
   heading's bounding box — the `<h3>` box can sit at the entry top while its first
   *line* is pushed below the float. The page's self-check banner already does this
   and prints `stacked: N / total` plus `BUG REPRODUCED`. Press `r` to re-measure;
   a screenshot is the ground truth.

Driving it: a CDP-capable visible-Chrome session (the way Codex reproduced the
original) or a browser-handoff session. Open:

```
file:///…/docs/repro/chrome-float-repro.html?grid=outer&float=before&img=1&n=14
```

## Config (query string)

| Param | Values | Default | Meaning |
|---|---|---|---|
| `grid` | `outer` \| `subgrid` \| `none` | `outer` | Is the entry list inside a CSS grid area? `none` keeps the column narrow without a grid. |
| `float` | `before` \| `div` | `before` | Floated empty `::before` (no image in the float) or a floated real `<div>`. |
| `img` | `1` \| `0` | `1` | Include a `loading="lazy"` image (absolutely positioned over the reserved shape). |
| `link` | `inline-block` \| `inline` | `inline-block` | Mimic WordPress core's Post Title link CSS, or override it to normal inline text. |
| `n` | integer | `14` | Number of entries; more = taller page = more below the fold. |

## Test matrix

Run each at `800 × 1200`, first paint, no scroll. Record `stacked N/total`.

| # | Query | Hypothesis isolated |
|---|---|---|
| 1 | `grid=outer&float=before&img=1&link=inline-block&n=14` | Baseline — WordPress-like Post Title link. |
| 2 | `grid=outer&float=before&img=0&link=inline-block&n=14` | Lazy image not required. |
| 3 | `grid=outer&float=div&img=1&link=inline-block&n=14` | Real floated element vs pseudo-element. |
| 4 | `grid=none&float=before&img=1&link=inline-block&n=14` | Outer grid not required. |
| 5 | `grid=subgrid&float=before&img=1&link=inline-block&n=14` | Subgrid not required. |
| 6 | `grid=outer&float=before&img=1&link=inline&n=14` | CSS escape hatch: normal inline title link. |

Interpretation:
- If `link=inline-block` stacks and `link=inline` is clean, the trigger is the
  WordPress Post Title link's atomic inline-block box, not images, subgrid, or the
  outer grid.
- A theme float variant can fix this with a scoped rule such as
  `.sidebar-entry > .wp-block-post-title :where(a) { display: inline; }`.
- Do not file Chromium from this repro unless a later reduction still fails after
  removing the `inline-block` title-link trigger.

## Visible Chrome 149 result (2026-06-20)

Codex first ran the original six-case matrix in **visible Chrome 149.0.7827.156**
with an `800 × 1200` CSS viewport, first paint, no scroll. All standalone cases were
clean until the reduction incorporated the real WordPress Post Title link rule:

```css
.wp-block-post-title :where(a) { display: inline-block; }
```

With that trigger represented, the matrix became:

| # | Query | Result |
|---|---|---|
| 1 | `grid=outer&float=before&img=1&link=inline-block&n=14` | `stacked: 14 / 14` |
| 2 | `grid=outer&float=before&img=0&link=inline-block&n=14` | `stacked: 14 / 14` |
| 3 | `grid=outer&float=div&img=1&link=inline-block&n=14` | `stacked: 14 / 14` |
| 4 | `grid=none&float=before&img=1&link=inline-block&n=14` | `stacked: 14 / 14` |
| 5 | `grid=subgrid&float=before&img=1&link=inline-block&n=14` | `stacked: 14 / 14` |
| 6 | `grid=outer&float=before&img=1&link=inline&n=14` | `stacked: 0 / 14` |

A captured live front page with the injected float reproduced the failure
(`stacked: 2 / 4`); adding only the scoped title-link override made it clean
(`stacked: 0 / 4`). So the root cause is now narrow: the WordPress Post Title link's
`display:inline-block` interacts badly with the float layout. The title link is an
atomic inline box; when it cannot fit beside the float, it drops below the floated
thumbnail. Longer titles fail first, which made the symptom look like a lower-entry /
below-the-fold Chrome issue.

## Chromium filing status

Do **not** file a Chromium issue from this reproduction as currently understood. The
standalone reduction points to a CSS/layout interaction caused by WordPress core's
Post Title link being `display:inline-block`. The project can avoid the float stack by
scoping the float variant to normal inline title links.
