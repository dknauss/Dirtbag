# Development guide

Dirtbag is intentionally low machinery. The theme should be understandable by reading the files in the repo.

## Repository layout

| Path | Purpose |
| --- | --- |
| `style.css` | WordPress theme header only. No theme CSS rules. |
| `theme.json` | Global settings, default style values, font families, spacing, and shared custom variables. |
| `styles/` | WordPress global style variations. |
| `templates/` | Block theme templates. |
| `parts/` | Header and footer template parts. |
| `patterns/` | PHP block patterns with translation-ready strings. |
| `languages/` | Translation template files. |
| `docs/` | Maintainer and release documentation. |
| `playground/` | WordPress Playground blueprints for stable-tag and main-branch previews. |
| `.planning/` | Local GSD planning state. Not part of release packages. |
| `bin/package-check` | Small local verification script. |

## Rules of the road

- Keep `style.css` as a header-only file.
- Do not add theme-authored front-end JavaScript in v1.
- Do not add a package manager or build step unless the project explicitly changes direction.
- Prefer `theme.json`, core block markup, template parts, and patterns.
- Prefer native HTML and WordPress core behaviour before custom behaviour.
- Keep copy changes intentional. Do not rewrite existing demo content unless that is the task.
- Keep site-root files such as `robots.txt`, `llms.txt`, and `blogroll.opml` out of the theme package.

## What "no theme stylesheet" means

Dirtbag ships **no enqueued or bundled CSS file**: `style.css` is header-only, and there are no other `.css` files in the package. That is the rule the package check enforces.

It does not mean the theme authors zero CSS. Theme styling is expressed the WordPress-native way, through `theme.json`:

- **Global styles.** Typography, spacing, colour, and per-block/element rules in `theme.json` (and the style variations) compile to WordPress's inline global-styles output. This is theme-authored styling — it just isn't a separate stylesheet.
- **A small custom-CSS block.** `theme.json` → `styles.css` is the theme's one sanctioned home for hand-written CSS — the deliberate exception, for rules core settings cannot express declaratively. Keep it short and justified; every rule here ships inline on every page. It currently carries five:
  1. A `byline` gap/margin reset so the author byline reads as one line.
  2. The truck-icon `filter` rule that reads the `--wp--custom--dirtbag--truck-icon-filter` variable (see [style variations](style-variations.md)).
  3. The `.front-grid` column alignment. The front page's two section columns each lead with a heading; in styles whose heading font wraps the narrow (33%) column's heading to two lines, its first post can drop ~one line below the wide column's. `theme.json`'s structured layout cannot align rows across sibling columns, so a CSS **subgrid** rule shares the heading/content row tracks between the two columns. It is wrapped in `@supports (grid-template-rows: subgrid)` and a `min-width: 782px` query, so browsers without subgrid — and all mobile widths — keep the default flex columns and stack normally. Headings stay nested in their columns, preserving reading order. The intended visual invariant is that the first row of post thumbnails in both columns starts on the same horizontal line; if the headings are adjusted, verify the tops of those images are flush, not merely the heading baselines.
  4. The `.sidebar-thumb` layouts (float + grid, one class toggle). The front-page sidebar posts show a small square thumbnail by their title/date/excerpt, in one of two layouts chosen by a modifier on the `.sidebar-content` group: the default **float** wraps the text *beside and under* the thumb (the magazine look), and `.sidebar-content.is-grid` switches to a fixed thumbnail column + text column (no wrap-under). For a long time the float "didn't work" — lower entries stacked the title under the thumb in live Chrome — and it turned out to be a collision with WordPress core's Post Title link CSS, `.wp-block-post-title :where(a) { display: inline-block; }`: an atomic inline-block box drops below a 60px float whenever it can't fit in the remaining line box, and longer titles in a narrower column fail first, which made it look like a below-the-fold Chrome bug. It is **not** lazy-loading, sub-pixel DPR, or the `.front-grid` subgrid — all ruled out via a minimal WordPress-free repro in [repro/](repro/README.md), confirmed in visible Chrome 149. The float variant fixes it with one scoped rule, `… > .wp-block-post-title :where(a) { display: inline }`; the grid variant needs no fix (its title wraps in its own column). `.sidebar-head` shrinks the sidebar section heading to 22px so it fits one line in the narrow column, and `align-self: end` baselines it against the taller wide-column heading. See [sidebar-thumbnail-layout.md](sidebar-thumbnail-layout.md).
  5. The `.wp-block-gallery` caption + frame. WordPress core renders gallery image captions as a white-on-image overlay with `overflow: auto` — which both fails colour contrast over light images and is the `scrollable-region-focusable` issue removed in 0.1.4. The escape pulls captions back into normal flow below each image (`position: static; overflow: visible; background: none; color: inherit`), and gives each gallery image a 2px `currentColor` frame so the brutalist look holds across all style variations. It is scoped to `.wp-block-gallery.has-nested-images figure.wp-block-image`.

So the accurate claim is: **no CSS files, no enqueued theme stylesheet, no front-end JavaScript** — not "no CSS at all." WordPress core may additionally print block, layout, and global-style assets required by the active blocks.

### Why root `styles.css` needs a guard

Root `styles.css` is a **string**, and core merges global styles with `array_replace_recursive()`. A string key does not merge — it is replaced. So any other origin that sets `styles.css` wipes the theme's entire root stylesheet, and the most ordinary way to trigger that is Site Editor → Styles → **Additional CSS**: one declaration typed there used to delete all five rules above at once, with no error and nothing to point at.

Two things keep that from happening:

- `dirtbag_preserve_root_custom_css()` (`functions.php`) hooks `wp_theme_json_data_user` and re-prepends the theme's root CSS to the user layer, so both survive. Theme rules go first, leaving the user's own CSS last and therefore winning ties — which is what someone writing Additional CSS expects.
- `bin/package-check` rejects a `styles.css` key in any `styles/*.json` variation. Applying a variation copies its JSON into that same user layer, so a variation defining root CSS would arrive already carrying the clobbering value.

The rules cannot simply move to per-block `styles.blocks.*.css`, which *does* merge per key. Core runs per-block CSS through `WP_Theme_JSON::process_blocks_custom_css()`, which discards `@supports` and `@media` wrappers outright — dropping the `.front-grid` rule entirely — and rewrites every selector as `:root :where(…)`, capping it at 0-1-0 specificity, where the gallery caption escape would lose to core's own 0-4-0 selector. Root `styles.css` is emitted verbatim, at its authored specificity, which is why these rules live there.

Regression coverage: `tests/styles/additional-css.spec.js`.

## Internationalization

Translatable UI strings live in **theme PHP** — mostly the patterns (`patterns/*.php`), plus the occasional string in `functions.php` (currently the lightbox `aria-label`) — using the `dirtbag` text domain, and are collected in `languages/dirtbag.pot`.

Block template and template-part HTML files (`templates/*.html`, `parts/*.html`) **cannot contain translation calls** — they are static HTML. Any prose written directly into those files is therefore untranslatable by WordPress design. Two consequences:

- Repeated, translatable UI prose is routed through patterns instead of being inlined. The post byline ("From … 's dashboard") lives in `patterns/byline.php` and is referenced from the feed and single templates via `wp:pattern`, so it is translatable.
  - The byline is two `esc_html_e()` fragments — `'From'` and `'’s dashboard'` — wrapped around the `post-author-name` block. Both land in `dirtbag.pot`, so the possessive "'s" can be translated or replaced. The trade-off: it is a split string around a variable, so languages with different word order or no possessive "'s" may need to rephrase rather than translate literally (e.g. render the suffix as "(dashboard)" or similar). If you ever want word-order-proof i18n, a single concept like "By [author]" is cleaner — at the cost of the dashboard pun.
  - **Keeping the "'s" attached (and off its own line).** The byline group is `flex-wrap: nowrap` with a `theme.json` `.byline { flex-shrink: 0 }` rule, so "From [author]'s dashboard" behaves as one unit: flexbox collapses the whitespace between the `post-author-name` block and the `'s dashboard` paragraph (the apostrophe sits flush on the name), and the whole byline drops to its own line — instead of orphaning `'s dashboard` — when the single-post meta row (now `flex-wrap: wrap`) runs out of room on narrow screens. **What it costs:** the split i18n string above, plus one CSS escape (`flex-shrink` alongside the existing `.byline` gap/margin reset, both `!important`), a reliance on flexbox's whitespace-collapse behaviour, and a `nowrap` that can overflow below ~340px of content width with a long author name. **Dirtbag-defensible?** Within the theme's means — core blocks + a translatable pattern + one small `theme.json` rule, no JavaScript and no `functions.php` — yes. But it is the theme's most indulgent flourish: a possessive pun paid for with a split string and a flexbox quirk. The honest, cheaper alternative is still `By [author]`.
- Some static chrome remains in template/part HTML and is **not** translatable: the skip link, footer text and menu labels, list-page headings ("Notebook", "Latest posts"), the no-results message, and the previous/next labels. This is a WordPress limitation, not a Dirtbag omission. Move a string into a pattern if it must be translatable.

Refresh `languages/dirtbag.pot` before release only when pattern strings change; avoid timestamp-only churn.

## Editor design controls

`appearanceTools: false` (our setting, and also the WordPress default) is **not** a lockdown. It only suppresses one bundle of controls: borders, link colour, spacing (margin/padding/`blockGap`), line height, min-height, and sticky position. Everything else stays at WordPress defaults, which is why the editor still shows plenty of controls (text/background colour, font size, drop shadow, and so on).

On top of that default, Dirtbag explicitly disables two more controls in `theme.json`:

- **Custom colour** — `settings.color.custom: false`. Editors pick from the palette swatches; there is no arbitrary hex picker.
- **Drop shadow** — `settings.shadow` with `defaultPresets: false` and no presets. No box-shadow control.

**Kept on, deliberately:** the colour palette, font family, font size, and style variations (**Appearance → Editor → Styles**).

### What `theme.json` cannot do

Important so the "brutalist" claim is not oversold. `theme.json` controls *which UI controls appear*; it does not lock the site down. It cannot:

- disable JavaScript, or stop a core block from loading its own scripts — the accordion and navigation blocks ship core view JS via the Interactivity API regardless of theme settings;
- unregister or block-list a block;
- remove the Site Editor's Additional CSS panel (that is a user capability, not a theme setting).

"No theme CSS/JS" means the theme ships none. It cannot subtract what WordPress core brings.

### Optional further lockdowns

`theme.json`-only levers, to weigh against usefulness:

- Disable custom font sizes: `typography.customFontSize: false` (keeps the named size presets only).
- Disable text/background colour entirely: `color.text: false`, `color.background: false`.
- Default palette is already locked out (`color.defaultPalette: false`).
- Scope any of the above to a single block via `settings.blocks["core/accordion"]` (etc.).
- Anything beyond `theme.json` — unregistering blocks, stopping core block JS, gating Additional CSS — needs `functions.php`/a plugin and breaks the no-PHP-runtime rule, so it stays out of scope for v1.

## Local workflow

Make the smallest useful change, then run:

```sh
bin/package-check
```

If the change affects rendered output, also check the local Studio site manually or in a browser-capable Codex session.

## Versioning

Theme version metadata currently lives in:

- `style.css`
- `readme.txt`

Update both together before a tagged release.

## No build step means no hidden step

Dirtbag should not require `npm install`, `composer install`, asset compilation, minification, transpilation, or generated CSS/JS to be usable. If a future tool is added for validation, it should be optional and documented as a check, not as a required build.

## Playground previews

Dirtbag keeps two small browser preview blueprints:

- `playground/blueprint-stable.json` installs the commit for the current stable tag. It uses the commit SHA rather than the annotated tag ref because Playground/isomorphic-git can fail on annotated tag pack resolution.
- `playground/blueprint-main.json` installs the main branch.

Both blueprints force the theme folder to `dirtbag` so theme asset paths resolve, and both seed the site logo from the bundled truck icon. Update the stable blueprint ref when cutting a new stable tag.

## Studio site, demo content, and publishing snapshots

The local Studio site is the **authoring workbench**, not a demo to be reset. Its theme folder is a symlink to this repo, so the site renders whatever branch is checked out. Content and Site-Editor edits happen here first, then get exported into theme files and into `playground/seed-content.json` plus `playground/media/`.

Directionality matters: the Playground seed is **derived from** the Studio site (Studio → seed file), not the other way around. Re-running the seed *into* Studio runs that backwards — it bulldozes live working content and imports a frozen, possibly older snapshot.

Routine editorial loop:

1. Edit posts, pages, categories, tags, captions, alt text, and featured images in Studio.
2. From the repo, preview the export:
   ```bash
   bin/export-studio-seed
   ```
3. If the summary is expected, write the snapshot:
   ```bash
   bin/export-studio-seed --write
   ```
4. Validate before committing:
   ```bash
   bin/package-check
   ```

The exporter preserves existing seed IDs by slug/post name where possible, copies referenced media from Studio uploads into `playground/media/`, rewrites portable in-content media placeholders, and prunes Playground media that is no longer part of the exported seed. It intentionally exports published posts and pages, authors, assigned categories/tags, selected image attachments, and the small option set needed by the preview. It does not export revisions, auto-drafts, comments, Site Editor database overrides, templates, template parts, or plugin state.

Two distinct "make it match the theme" operations:

- **Clear overrides only (routine, safe).** When the Studio site renders stale because Site-Editor template/template-part customizations in the database shadow the theme files, delete just those overrides so the committed files take over. Content (posts, pages, media, menus) is preserved. Back up `wp-content/database/.ht.sqlite` first; restore by copying the backup back over it. This is the normal way to make Studio reflect the committed theme.
- **Full wipe + reseed (rare, throwaway only).** Deleting all content *and* overrides and re-running `playground/seed-content.php` produces a pristine canonical demo (theme files + seeded content). Do this on a **throwaway** Studio site, never the main workbench, and only to validate the brand-new-user experience before a tag/release. Before reseeding anywhere for real, first **re-export current Studio content back into the Playground seed** so you are not restoring an older draft.

The free pristine demo already exists: the Playground links run `playground/seed-content.php` from a blank install on every load. Use those for a clean-room view instead of resetting Studio. Static GitHub Pages exports should be made from a committed seed snapshot whenever possible; Studio can remain the short-term exporter, but the repo seed is the publishable source of truth.
