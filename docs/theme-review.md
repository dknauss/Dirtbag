# WordPress.org theme review notes

Dirtbag is listed in the WordPress.org theme directory at [wordpress.org/themes/dirtbag](https://wordpress.org/themes/dirtbag/). Keep future releases review-ready without losing the small-site philosophy.

Accepted listing baseline: **0.1.16**, published on WordPress.org on **June 30, 2026** after themes.trac ticket **#277839**.

## Required theme files

The package must include:

- `style.css`
- `readme.txt`
- `license.txt`
- `screenshot.png`
- `theme.json`
- `templates/index.html`
- `languages/dirtbag.pot`

## Package exclusions

Do not include development-only files in the release zip:

- `.git/`
- `.github/`
- `.planning/`
- `playground/`
- local backups
- database dumps
- root site-kit files such as `robots.txt`, `llms.txt`, `about.txt`, `blogroll.opml`, or `.well-known/security.txt`

The site-root files are documented as templates in [site-root open-web files](site-root-open-web-files.md).

## Translatability

- Text domain: `dirtbag`.
- Domain path: `/languages`.
- PHP pattern strings should use translation functions.
- Refresh `languages/dirtbag.pot` before release, but avoid committing timestamp-only churn.

## Security

The theme should not process privileged actions, save user input, call remote services, or register custom REST endpoints. Pattern PHP should only register pattern metadata/content and should keep strings escaped or translation-ready as appropriate.

## Performance

Dirtbag should remain light:

- No external fonts.
- No analytics.
- No third-party scripts.
- No bundled JavaScript runtime.
- No extra CSS files.
- No build artefacts.

WordPress core may still output block, layout, and global-style assets required by the active blocks.

## Credits

Keep third-party resource credits in `readme.txt`. Current credits include:

- CC0 pickup truck source image from SVG Repo.
- Dirtbag truck icon adaptations generated from that source.
- Typography scale inspiration from Butterick’s Practical Typography.

## Future release checklist

1. Run `bin/package-check`.
2. Run the official Theme Check plugin.
3. Test the Site Editor and every style variation.
4. Test keyboard navigation and small viewports.
5. Validate rendered HTML on representative pages.
6. Confirm package contents before uploading.
7. Publish the already-verified GitHub release ZIP with the **Publish to WordPress.org** workflow. Run it once with `dry_run` enabled, then again with `dry_run` disabled. The repository secrets `WPORG_USERNAME` and `WP_ORG_PASSWORD` must contain the WordPress.org SVN credentials. The legacy `WPORG_PASSWORD` name is also accepted.
8. After upload/approval, verify the live listing, support forum, translations link, screenshots, version number, and download package at [wordpress.org/themes/dirtbag](https://wordpress.org/themes/dirtbag/).

The workflow downloads `dirtbag.zip` from the matching `v<version>` GitHub release, verifies the package version and exclusions again, stages a new immutable version directory in `https://themes.svn.wordpress.org/dirtbag/`, and commits only that directory. WordPress.org theme SVN versions cannot be overwritten; publish a higher version to correct a released mistake.

## Upload scanner triage (Theme Check)

The WordPress.org upload scanner runs the [Theme Check](https://wordpress.org/plugins/theme-check/)
plugin. Reproduce its result locally by scanning the **release zip** (the dev
directories in `.gitattributes` `export-ignore` are absent there, so scanning the
working tree reports extra `axe-styles.sh` / `playground/` hits that never ship):

```
unzip dirtbag-<v>.zip -d wp-content/themes/   # installs as theme slug "dirtbag"
wp i18n …                                      # (Theme Check runs via the admin UI
                                               #  or run_themechecks_against_theme())
```

The accepted 0.1.16 package produced no unresolved blocking Theme Check notes.
The recurring non-blocking notes below are intentional unless the relevant code changes:

| Note | Level | Verdict |
| --- | --- | --- |
| No `register_block_style` reference found | RECOMMENDED | **Ignore.** Optional recommendation, not a defect. Dirtbag ships no custom per-block styles by design — it stays close to core blocks. `register_block_style()` registers per-block toolbar style options, which is a *different* feature from the global style variations in `styles/*.json` (those are whole-site looks, not block styles). Not adding block styles is an intentional choice. |
| No `register_block_pattern` reference found | RECOMMENDED | **Ignore.** Block-theme false positive. Patterns are auto-registered by core from `patterns/*.php` headers; calling `register_block_pattern()` would double-register them. |
| Possible hard-coded links in `patterns/blogroll-xfn.php` | INFO | **Ignore.** Intentional. A blogroll/XFN pattern is by definition a curated list of external links (indieweb.org, microformats.org, archive.org, textfiles.com). |
| Only one text-domain (`dirtbag`) is used | INFO | **Ignore.** This is a pass confirmation — the single domain matches the theme slug, as required for language-pack compatibility. |

None require a code change. Re-confirm this list whenever patterns, `functions.php`,
or external links change.

## Playground seed content

The `playground/` directory is repo-only demo infrastructure. It seeds content, taxonomy terms, authors, media, and preview state for WordPress Playground links. It must stay out of WordPress.org theme release zips.
