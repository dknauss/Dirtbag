# What's in the `<head>`

Dirtbag adds almost nothing to `<head>`, because WordPress core already puts
most of it there for a block theme. This note says exactly who emits what, so
the next person does not add a tag core is already printing — or go looking for
one that is deliberately absent.

The framing is the same as the [philosophy audit](philosophy-audit.md): core
parts first, theme parts only where core has left a real gap, aftermarket parts
only with a named job.

## What WordPress core emits, with no theme code

A block theme gets all of this for free. None of it is Dirtbag's doing, and
none of it should be re-implemented in `functions.php`:

| Tag / behaviour | Emitted by |
| --- | --- |
| `<!doctype html>`, `lang`, `<meta charset>` | the block template canvas |
| `<meta name="viewport">` | `_block_template_viewport_meta_tag()` (`wp_head`, priority 0, since 5.8) |
| `<title>` | `_block_template_render_title_tag()` — unconditional for block themes |
| `<link rel="canonical">` | `rel_canonical()` |
| RSS/Atom feed discovery | `feed_links()` + `feed_links_extra()`; block themes get `automatic-feed-links` from `_add_default_theme_supports()` |
| `<meta name="robots">` (incl. `max-image-preview:large`, noindex on search/embeds) | `wp_robots()` |
| Favicon, apple-touch-icon, msapplication-TileImage | `wp_site_icon()` — see [site-icons-and-logos.md](site-icons-and-logos.md) |
| XML sitemap + the `Sitemap:` line in the virtual `robots.txt` | `wp_sitemaps` (since 5.5) |
| oEmbed discovery, RSD/EditURI, REST `Link` | core defaults |

## What Dirtbag adds

Exactly two tags, both from `dirtbag_head_color_meta()` in `functions.php`:

- `<meta name="color-scheme">`
- `<meta name="theme-color">`

Core emits neither. `color-scheme` is the one that earns its place: without it,
form controls, scrollbars, and spinners render as light user-agent widgets on
the dark variations — a black Terminal page with a white search box.

Both are derived from the **resolved background colour** in the merged global
styles, not from a variation slug. WordPress does not persist which variation is
active — applying one copies its JSON into the user global-styles post — so
there is no slug to read at runtime. Reading the resolved value instead means
the tags follow the site owner's own Site Editor customisations for free.

The light/dark split is the equal-contrast point against black and white
(`sqrt(1.05 * 0.05) - 0.05`, about 0.1791), not an arbitrary midpoint, so it
stays correct for a background the owner picked themselves.

**It fails closed.** The default Brutalist style declares no background at all —
it rides the user-agent default — so it gets neither tag. No declared colour, no
claim. Non-hex values (`rgb()`, named colours, an unresolved `var()`) are
rejected by `sanitize_hex_color()` and also emit nothing.

Tested in `tests/php/color-scheme-test.php` (pure logic + the emitted markup)
and `tests/styles/head-meta.spec.js` (per variation, in a browser).

## What deliberately needs a plugin

These are on most "website specification" checklists. Dirtbag does not emit them,
and that is a decision, not an oversight:

- **Meta description**
- **Open Graph / Twitter card tags**
- **JSON-LD structured data**, including a `BreadcrumbList` companion for the
  core breadcrumbs block in `parts/header.html`
- **Web app manifest**, service worker, offline fallback

Three reasons, in order of weight:

1. **It is plugin territory.** The WordPress.org theme review guidelines put
   "SEO options" and social-sharing features outside what a theme may do — the
   dividing line is design and presentation. This metadata is a machine-readable
   payload for third parties, and it should not vanish when someone switches
   themes.
2. **It would collide.** Yoast, Rank Math, SEOPress, AIOSEO, The SEO Framework,
   Slim SEO, and Jetpack all emit `og:*` on `wp_head`. A theme that did the same
   would give those users duplicate tags, with the winner decided by hook
   priority — a silent bug with no visible cause. Detecting each plugin to back
   off is a hardcoded list that rots.
3. **It is off-thesis.** Dirtbag's structured-data story is the open-web one:
   microformats2 (`h-card`, XFN), `rel=me`, OPML, and feeds. Open Graph is a
   silo protocol. If you want share cards, install an SEO plugin — that is the
   right tool, and it is one line in the colophon.

If you want the site-level pieces a theme genuinely cannot ship — `robots.txt`,
`llms.txt`, `security.txt`, `humans.txt`, OPML — those are site-root files, with
templates in [site-root-open-web-files.md](site-root-open-web-files.md).
