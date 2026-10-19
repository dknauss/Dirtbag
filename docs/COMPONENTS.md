# Component ownership and editing

These patterns are reusable editorial starters. Ordinary inserted copies remain editable and detached. Theme templates and microformat wrappers are code-owned; preserve h-card, h-entry, rel-me, XFN and accessible reading order when refactoring.

Follow [the shared workflow](COMPONENT-WORKFLOW.md). `components.json` is the checked inventory.

## Contract inventory

| Component | Source | Editing / update model |
|---|---|---|
| `parts/footer.html` | [`parts/footer.html`](../parts/footer.html) | Git structure; WordPress content; audit overrides |
| `parts/header.html` | [`parts/header.html`](../parts/header.html) | Git structure; WordPress content; audit overrides |
| `parts/navigation-overlay.html` | [`parts/navigation-overlay.html`](../parts/navigation-overlay.html) | Git structure; WordPress content; audit overrides |
| `dirtbag/accessible-table` | [`patterns/accessible-table.php`](../patterns/accessible-table.php) | Editable starter; inserted copies detached |
| `dirtbag/almanac-card` | [`patterns/almanac-card.php`](../patterns/almanac-card.php) | Editable starter; inserted copies detached |
| `dirtbag/blogroll-xfn` | [`patterns/blogroll-xfn.php`](../patterns/blogroll-xfn.php) | Editable starter; inserted copies detached |
| `dirtbag/byline` | [`patterns/byline.php`](../patterns/byline.php) | Editable starter; inserted copies detached |
| `dirtbag/colophon` | [`patterns/colophon.php`](../patterns/colophon.php) | Editable starter; inserted copies detached |
| `dirtbag/color-style-demo-panel` | [`patterns/color-style-demo-panel.php`](../patterns/color-style-demo-panel.php) | Editable starter; inserted copies detached |
| `dirtbag/comments` | [`patterns/comments.php`](../patterns/comments.php) | Editable starter; inserted copies detached |
| `dirtbag/field-note` | [`patterns/field-note.php`](../patterns/field-note.php) | Editable starter; inserted copies detached |
| `dirtbag/front-page` | [`patterns/front-page.php`](../patterns/front-page.php) | Editable starter; inserted copies detached |
| `dirtbag/h-card-profile` | [`patterns/h-card-profile.php`](../patterns/h-card-profile.php) | Editable starter; inserted copies detached |
| `dirtbag/now-section` | [`patterns/now-section.php`](../patterns/now-section.php) | Editable starter; inserted copies detached |
| `dirtbag/open-web-links` | [`patterns/open-web-links.php`](../patterns/open-web-links.php) | Editable starter; inserted copies detached |
| `dirtbag/post-meta` | [`patterns/post-meta.php`](../patterns/post-meta.php) | Editable starter; inserted copies detached |
| `dirtbag/previous-next` | [`patterns/previous-next.php`](../patterns/previous-next.php) | Editable starter; inserted copies detached |
| `dirtbag/rel-me-links` | [`patterns/rel-me-links.php`](../patterns/rel-me-links.php) | Editable starter; inserted copies detached |
| `dirtbag/roadside-notice` | [`patterns/roadside-notice.php`](../patterns/roadside-notice.php) | Editable starter; inserted copies detached |
| `dirtbag/webmention-invitation` | [`patterns/webmention-invitation.php`](../patterns/webmention-invitation.php) | Editable starter; inserted copies detached |
| `styles/amber-crt.json` | [`styles/amber-crt.json`](../styles/amber-crt.json) | Git presets; selection stored in WordPress |
| `styles/blueprint.json` | [`styles/blueprint.json`](../styles/blueprint.json) | Git presets; selection stored in WordPress |
| `styles/hi-vis.json` | [`styles/hi-vis.json`](../styles/hi-vis.json) | Git presets; selection stored in WordPress |
| `styles/minimalist.json` | [`styles/minimalist.json`](../styles/minimalist.json) | Git presets; selection stored in WordPress |
| `styles/newspaper.json` | [`styles/newspaper.json`](../styles/newspaper.json) | Git presets; selection stored in WordPress |
| `styles/terminal.json` | [`styles/terminal.json`](../styles/terminal.json) | Git presets; selection stored in WordPress |
| `templates/404.html` | [`templates/404.html`](../templates/404.html) | Git structure; WordPress content; audit overrides |
| `templates/archive.html` | [`templates/archive.html`](../templates/archive.html) | Git structure; WordPress content; audit overrides |
| `templates/author.html` | [`templates/author.html`](../templates/author.html) | Git structure; WordPress content; audit overrides |
| `templates/category.html` | [`templates/category.html`](../templates/category.html) | Git structure; WordPress content; audit overrides |
| `templates/date.html` | [`templates/date.html`](../templates/date.html) | Git structure; WordPress content; audit overrides |
| `templates/front-page.html` | [`templates/front-page.html`](../templates/front-page.html) | Git structure; WordPress content; audit overrides |
| `templates/home.html` | [`templates/home.html`](../templates/home.html) | Git structure; WordPress content; audit overrides |
| `templates/index.html` | [`templates/index.html`](../templates/index.html) | Git structure; WordPress content; audit overrides |
| `templates/page-about.html` | [`templates/page-about.html`](../templates/page-about.html) | Git structure; WordPress content; audit overrides |
| `templates/page-archive.html` | [`templates/page-archive.html`](../templates/page-archive.html) | Git structure; WordPress content; audit overrides |
| `templates/page-centered.html` | [`templates/page-centered.html`](../templates/page-centered.html) | Git structure; WordPress content; audit overrides |
| `templates/page-colophon.html` | [`templates/page-colophon.html`](../templates/page-colophon.html) | Git structure; WordPress content; audit overrides |
| `templates/page-feeds.html` | [`templates/page-feeds.html`](../templates/page-feeds.html) | Git structure; WordPress content; audit overrides |
| `templates/page-links.html` | [`templates/page-links.html`](../templates/page-links.html) | Git structure; WordPress content; audit overrides |
| `templates/page-no-title.html` | [`templates/page-no-title.html`](../templates/page-no-title.html) | Git structure; WordPress content; audit overrides |
| `templates/page-now.html` | [`templates/page-now.html`](../templates/page-now.html) | Git structure; WordPress content; audit overrides |
| `templates/page-plain.html` | [`templates/page-plain.html`](../templates/page-plain.html) | Git structure; WordPress content; audit overrides |
| `templates/page-search.html` | [`templates/page-search.html`](../templates/page-search.html) | Git structure; WordPress content; audit overrides |
| `templates/page-uses.html` | [`templates/page-uses.html`](../templates/page-uses.html) | Git structure; WordPress content; audit overrides |
| `templates/page-wide.html` | [`templates/page-wide.html`](../templates/page-wide.html) | Git structure; WordPress content; audit overrides |
| `templates/page.html` | [`templates/page.html`](../templates/page.html) | Git structure; WordPress content; audit overrides |
| `templates/search.html` | [`templates/search.html`](../templates/search.html) | Git structure; WordPress content; audit overrides |
| `templates/single.html` | [`templates/single.html`](../templates/single.html) | Git structure; WordPress content; audit overrides |
| `templates/tag.html` | [`templates/tag.html`](../templates/tag.html) | Git structure; WordPress content; audit overrides |
| `theme.json` | [`theme.json`](../theme.json) | Git tokens; review saved selections |

## Validation and release

Run `python3 tools/check-components.py`. CI checks the inventory and interfaces.
Use `tools/audit-design-overrides.php` via read-only WP-CLI before a design release.
Review the existing repository test/build instructions as well; this checker is not an application test.
Changing files does not reconcile database overrides or rewrite existing inserted patterns.
