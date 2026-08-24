# Printing Dirtbag

Dirtbag has one `@media print` block, and it lives in `theme.json`'s root
`styles.css` alongside the other rules core settings cannot express. There is no
`print.css`: the theme ships no CSS files at all, and `bin/package-check`
enforces that.

## Why the theme needs print rules at all

Browsers do not print background colours by default. On the light variations
that is harmless. On the dark ones — Terminal, Amber CRT, Blueprint — it is a
silent failure: the page keeps its near-white text, loses the black behind it,
and comes out of the printer blank or close to it. Nothing on screen suggests
anything is wrong.

That is also why the coverage is per-style rather than a single check: the
regression cannot appear on a light variation, so the guard has to run against
each one in turn.

## What the rules do

**Black ink on white paper, whatever the variation.** `html, body` are forced to
white with black text, and `body *` drops every inherited colour, background
image, and shadow. `!important` throughout — global styles set these colours on
selectors a root `styles.css` string cannot outrank, and the reset has to win
against all seven variations plus whatever the site owner has changed in the
Site Editor.

**The truck prints as artwork, not as a filter.** The masthead logo is recoloured
for dark screens through `--wp--custom--dirtbag--truck-icon-filter` (see
[style-variations.md](style-variations.md)). On white paper that filter is an
invisible logo, so print resets it to `none`.

**Chrome that cannot be used on paper is dropped**: both navigations, both skip
links (core injects its own `#wp-skip-link` above the one in
`parts/header.html`), search, previous/next post links, comments pagination, the
comment form and its reply/edit links, and the image lightbox trigger.
Breadcrumbs stay — they are the one piece of the header that still tells a reader
where the page came from.

**Link URLs are spelled out — in the article body only.** `.e-content` and the
webmention invitation get ` <https://…>` after every absolute link. The byline,
categories, and tags deliberately do not: those are navigation, and printing four
taxonomy URLs under every post is clutter a reader cannot act on. Relative hrefs
are skipped everywhere, since they resolve against a page the reader no longer
has.

**Ordinary paged-media hygiene**: a 2cm page margin, `break-after: avoid` on
headings so none is orphaned from what it heads, `break-inside: avoid` on
figures, blockquotes, `pre`, tables and images, and `orphans`/`widows` of 3.

## Coverage

`tests/styles/print.spec.js`, driven per style by `tests/axe-styles.sh` — run it
alone with `npm run test:styles:print`. Each check flips
`page.emulateMedia({ media: 'print' })` and asserts against the *on-screen* state
first, so a selector that stopped matching fails loudly instead of passing by
matching nothing.

Unlike `head-meta.spec.js` and `truck-icon.spec.js`, this spec is not skipped in
CI: every assertion holds for any active variation, so a CI run that only ever
scans the default style still tests something real.

One of the six tests exists purely to catch an over-eager reset — it asserts the
post title and content still print. Delete rules from the block and that is the
test that should fail.
