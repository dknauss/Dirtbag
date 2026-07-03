# Dirtbag docs

This folder holds repo-facing documentation for the Dirtbag WordPress block theme. It is for maintainers, reviewers, and anyone who wants to understand how the theme stays small.

## Start here

- [Development guide](development.md) — repo layout, editing rules, and the no-build-step workflow.
- [Testing guide](testing.md) — local checks, manual WordPress checks, browser checks, accessibility checks, and release gates.
- [Style variations](style-variations.md) — how the global styles work and how the truck icon colours are handled.
- [Site logos, site icons, and favicons](site-icons-and-logos.md) — the three separate brand marks, where each displays, and which ones CSS can recolour.
- [WordPress.org theme review notes](theme-review.md) — packaging, credits, translatability, security, performance, and review checklist.
- [Site-root open-web file templates](site-root-open-web-files.md) — `robots.txt`, `llms.txt`, OPML, and other files that belong in the site root, not the theme zip.
- [GitHub Pages static export](github-pages-static-export.md) — how the live demo at `dknauss.github.io/dirtbag` is crawled, rewritten, and deployed to the `gh-pages` branch.
- [Backlog](backlog.md) — planned checks and improvements.
- [WordPress contribution notes](wordpress-contributions.md) — notable WordPress/Gutenberg/core contributions and a `wptexturize()` apostrophe deep dive.

## Official listing and live previews

- [WordPress.org theme listing](https://wordpress.org/themes/dirtbag/) — official distribution package, screenshots, downloads, reviews, translations, and theme metadata.
- [WordPress.org support forum](https://wordpress.org/support/theme/dirtbag/) — site-specific help and first-user feedback.
- [Playground preview: stable tag](https://playground.wordpress.net/?blueprint-url=https://raw.githubusercontent.com/dknauss/dirtbag/main/playground/blueprint-stable.json)
- [Playground preview: main branch](https://playground.wordpress.net/?blueprint-url=https://raw.githubusercontent.com/dknauss/dirtbag/main/playground/blueprint-main.json)
- [Static demo (GitHub Pages)](https://dknauss.github.io/dirtbag/) — a crawled, backend-free snapshot. See [github-pages-static-export.md](github-pages-static-export.md).

## Project memory

The `.planning/` directory contains GSD project memory and roadmap state. It is useful for local development, but it is not part of a WordPress.org theme package.
