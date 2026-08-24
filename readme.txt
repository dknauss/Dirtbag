=== Dirtbag ===
Contributors: dpknauss
Donate link: https://github.com/sponsors/dknauss
Requires at least: 7.0
Tested up to: 7.0
Requires PHP: 7.2
Stable tag: 0.1.18
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html
Tags: full-site-editing, one-column, block-patterns, style-variations, translation-ready, microformats, blog

A hyper-simple block theme for plain HTML, core blocks, web-safe fonts, and road grit.

== Description ==

Dirtbag is a small WordPress block theme with standard templates, simple template parts, style variations, web-safe font choices, and no bundled JavaScript runtime.

The default style is intentionally plain. Additional style variations provide sparse colour and typography changes through theme.json. WordPress core may still output global styles, layout styles, block styles, and block scripts needed by core blocks.

== Privacy ==

Dirtbag does not collect, store, or transmit user data. It does not load remote resources, analytics, tracking pixels, external fonts, or third-party scripts.

== Frequently Asked Questions ==

= Does Dirtbag include JavaScript? =

No theme-authored JavaScript, and no bundled libraries. WordPress core still loads its own scripts where core blocks need them — the navigation overlay, enhanced pagination, and image lightbox use core's Interactivity API — and each falls back to plain HTML when that script does not run.

= Does Dirtbag load external fonts or assets? =

No. The theme uses web-safe font stacks and local icon assets.

= How do I switch styles? =

Open Appearance > Editor > Styles and choose a style variation.

= Where is the official theme listing and support forum? =

The official WordPress.org listing is https://wordpress.org/themes/dirtbag/. For site-specific help, use https://wordpress.org/support/theme/dirtbag/.

== Changelog ==

= 0.1.18 =
* Add active-style colour metadata so dark variations render browser UI with the right colour scheme.
* Preserve the theme's root CSS when Site Editor Additional CSS is added or cleared.
* Add a print stylesheet that keeps every variation legible on paper and removes non-content chrome.
* Harden Playground style switching and CI startup so per-variation tests exercise the intended style reliably.

= 0.1.17 =
* Add the official WordPress.org theme listing, support forum, and GitHub Sponsors donation link to the readme. Documentation-only release housekeeping after the initial directory acceptance.

= 0.1.16 =
* Theme review (themes.trac #277839): refresh the front-page screenshot to match the current two-column masthead and dynamic Query Loop sections (the shipped screenshot still showed the pre-0.1.10 layout). Version bump for the WordPress.org resubmission.

= 0.1.15 =
* Theme review (themes.trac #277839): replace the real external links in the Blogroll with XFN pattern with example.com placeholders and generic relationship labels, so the theme ships no hard-coded third-party URLs.
* Theme review: make every user-facing string in patterns/front-page.php translation-ready (esc_html_e / esc_attr_e), and replace the hard-coded demo post links with dynamic Query Loop blocks — a sticky-only featured loop, a non-sticky masthead loop, and a non-sticky sidebar loop with a page offset — so the sections show distinct posts and the front page works on a fresh install. Regenerate languages/dirtbag.pot.
* Theme review: add an explicit licence type and licence URL to every entry in the Resources list, clarify that the photographs are Playground demo media (excluded from the theme package) while the only bundled third-party asset is the pickup-truck SVG, and drop the Butterick's Practical Typography line (a design influence, not a bundled or licensed asset).

= 0.1.14 =
* Packaging: ship only the two theme SVGs in the icon assets. The demo logo and favicon PNGs move to the Playground demo media (the seed imports them from there), and three unused icon variants are removed. Trims the download; the demo favicon behaviour is unchanged.

= 0.1.13 =
* Site icon: ship an opaque, manila-backed favicon so the truck stays visible in browser tabs and the WordPress admin icon, where CSS filters cannot reach a transparent mark on a dark background. Decouple it from the header Site Logo (the logo no longer syncs the icon), so the header keeps the transparent, per-style-recoloured truck without a background box on coloured styles.

= 0.1.12 =
* Accessibility: give the core image lightbox "enlarge" button a static, translatable aria-label. Core only names that button at runtime via the Interactivity API, so with JavaScript off — or before hydration — it had no accessible name. The theme now names it in the server-rendered HTML (core's script still refines the label when it runs), so images can keep the lightbox without failing the button-name check.

= 0.1.11 =
* Header: when no Site Logo is set, fall back to the bundled pickup-truck mark so the logo appears on a fresh install and in the WordPress.org directory preview — not only after the demo seed runs. An uploaded Site Logo, or a synced Site Icon, still takes precedence.

= 0.1.10 =
* Front page: rebuild the masthead as a two-column row — the heading and an italic standfirst on the left, a curated list of featured posts on the right; drop the trailing period from the heading.

= 0.1.9 =
* Translation: regenerate languages/dirtbag.pot — correct the Theme URI and Author URI (danknauss → dknauss), refresh version metadata, and add 13 newly-extracted pattern and template strings.
* Directory listing: add accurate theme tags — block-patterns, translation-ready, microformats, and the blog subject tag — to better reflect what the theme ships.
* Theme review: document the WordPress.org upload-scanner (Theme Check) triage. The 0.1.8 release zip produced no required or warning notes; the remaining Recommended/Info notes are block-theme false positives or intentional, and need no code change.

= 0.1.8 =
* Front page: shorten the masthead to "Roadside Almanac." and add a standfirst line below it.
* Accessibility: render gallery image captions below the image in normal flow instead of a white-on-image overlay (fixes colour contrast and the scrollable-region-focusable overlay); frame gallery images with a 2px border.
* Playground: seed the "We blamed the browser" screenshot gallery into the demo, via portable in-content media tokens resolved by the seed importer.

= 0.1.7 =
* Front-page sidebar: render posts as a magazine float (text wraps beside and under the thumbnail) or a media-object grid, toggled by one class; fix a Post Title inline-block collision that dropped long titles below the float.
* Give every post a distinct featured image; publish "The price of a pun" and "We blamed the browser".
* Add a WordPress-free repro of the float interaction (filed as WordPress/gutenberg#79372); baseline-align the section headings and flush the sidebar thumbnail top; pin the stable Playground blueprint.

= 0.1.6 =
* Front page: add a "Used Cars & Unused Plans" sidebar (a compact secondary feed with square thumbnails) and a small "The Almanac" card; add a masthead heading, "A Roadside Almanac", and shorten the tagline.
* Front page: align the two section columns with a CSS subgrid and baseline-align the sidebar heading; lay out the sidebar thumbnails with a CSS grid after a float wrap-under proved unreliable in Chrome (documented in docs/sidebar-thumbnail-layout.md).
* Content: give every post a distinct featured image and publish "The build sheet".

= 0.1.5 =
* Accessibility: graduate the confirmed-clean axe rule set to gating (image-alt, link-name, label, heading-order, landmark-unique, region, color-contrast, button-name) and add a per-style sweep that checks color contrast on every global style variation.
* Accessibility: fix an unnamed image-lightbox control on the h-card avatar by disabling the lightbox on that decorative icon.
* Ship a photo-free package: remove the bundled CC-licensed photographs and refresh the theme screenshot.

= 0.1.4 =
* Accessibility: remove the scrollable overlay captions from the front-page gallery (alt text kept; credits remain in this readme).
* WordPress.org Theme Check cleanup: drop the invalid block-theme tag, add a GPL copyright notice, and remove base64_decode from the bundled Playground seed.
* Expand the README overview and align the JavaScript policy wording with the core-Interactivity-first doctrine.

= 0.1.3 =
* Require WordPress 7.0 and PHP 7.2+; use the core Breadcrumbs block.
* State the JavaScript policy honestly: no theme-authored or bundled JavaScript, but core blocks may load WordPress's own (the Interactivity API), each with a plain-HTML fallback.
* Opt into core progressive enhancements: navigation overlay, enhanced (no-reload) pagination, and the image lightbox.
* Add Archive (master index) and Search page templates.
* Improve microformats2 markup (h-card path, post date binding, u-url) and make the byline translatable.
* Collapse style variations to their deltas over theme.json; document the editor-controls, CSS, and i18n policies.
* Add CC0 demo imagery and Playground seed content; add package-check and Playwright/CI tests.

= 0.1.2 =
* Apply barebones Playground export for header and front page.

= 0.1.1 =
* Refine header layout and add Playground demo content.

= 0.1.0 =
* Initial theme.

== Copyright ==

Dirtbag WordPress Theme, Copyright 2026 Dan Knauss.
Dirtbag is distributed under the terms of the GNU GPL v2 or later.

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 2 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

Third-party resources retain their own licences, listed below with licence type,
licence URL, and source URL. The only third-party asset files shipped in the
theme package are the pickup-truck SVG and the icon variants generated from it
(all CC0 1.0). No standalone photograph files are shipped: the photographs are
Playground demo media, bundled only with the demo seed under /playground, which
is excluded from the theme package (.gitattributes export-ignore).

The one exception is the bundled screenshot.png, which depicts the demo front
page and therefore incorporates some of those demo photographs as a packaged
derivative. They are CC0 1.0 except "Potluck" (CC BY 2.0); all are listed and
attributed under Resources below.

== Resources ==

In the theme package:

* Pickup Truck SVG Vector, SVG Repo, CC0 1.0, licence: https://creativecommons.org/publicdomain/zero/1.0/, source: https://www.svgrepo.com/svg/452616/pickup-truck
* Dirtbag pickup truck icon variants are adapted from the SVG Repo pickup truck icon with small CC0-compatible grit marks added by the theme author; released under CC0 1.0, https://creativecommons.org/publicdomain/zero/1.0/.
* Dirtbag site icon PNG variants are generated from the local pickup truck SVG variants; released under CC0 1.0, https://creativecommons.org/publicdomain/zero/1.0/.
* screenshot.png is a packaged derivative depicting the demo front page; it incorporates demo photographs listed under "Playground demo media" below (all CC0 1.0, except "Potluck", CC BY 2.0, attributed there).

Playground demo media (shipped only in the demo seed, except as incorporated into screenshot.png above):

* Potluck, La.Catholique, CC BY 2.0, licence: https://creativecommons.org/licenses/by/2.0/, source: https://www.flickr.com/photos/38559542@N02/8167936623
* Abandoned rusty Ford pickup truck, Jonathan Desrosiers, CC0 1.0, licence: https://creativecommons.org/publicdomain/zero/1.0/, source: https://wordpress.org/photos/photo/3526751dbe/
* Blue Bird Truck Stop sign, libraryofcongress, CC0 1.0, licence: https://creativecommons.org/publicdomain/zero/1.0/, source: https://www.rawpixel.com/image/3797049/photo-image-blue-vintage-bird
* Old Truck near Great Sand Dunes Colorado, Log Home Finishing, CC0 1.0, licence: https://creativecommons.org/publicdomain/zero/1.0/, source: https://www.flickr.com/photos/23399885@N06/40197635543
* Sunny Side Truck Stop Cafe, libraryofcongress, CC0 1.0, licence: https://creativecommons.org/publicdomain/zero/1.0/, source: https://www.rawpixel.com/image/3800505/photo-image-logo-vintage-neon
* Red pickup truck, creator not listed, CC0 1.0, licence: https://creativecommons.org/publicdomain/zero/1.0/, source: https://www.rawpixel.com/image/6035980/red-pickup-truck-free-public-domain-cc0-photo
* Folding table and chairs, green 2008, robert therrian, CC0 1.0, licence: https://creativecommons.org/publicdomain/zero/1.0/, source: https://commons.wikimedia.org/w/index.php?curid=163543396
* Driver This 1975 Van Watched, U.S. National Archives, CC0 1.0, licence: https://creativecommons.org/publicdomain/zero/1.0/, source: https://www.rawpixel.com/image/8765476/photo-image-vintage-retro
* Datsun 521 Truck 1500, 先従隗始, CC0 1.0, licence: https://creativecommons.org/publicdomain/zero/1.0/, source: https://commons.wikimedia.org/w/index.php?curid=172568009
* Ford Cortina, Txemai Argazki, CC0 1.0, licence: https://creativecommons.org/publicdomain/zero/1.0/, source: https://www.flickr.com/photos/59170444@N05/52478677429
* Toyota RT66P Corona Mark II Double Pick, 先従隗始, CC0 1.0, licence: https://creativecommons.org/publicdomain/zero/1.0/, source: https://commons.wikimedia.org/w/index.php?curid=172568010
* Sign roadside curio shop, 05/1972, U.S. National Archives, CC0 1.0, licence: https://creativecommons.org/publicdomain/zero/1.0/, source: https://www.rawpixel.com/image/8802552/photo-image-mountain-nature-landscape
* Highway crossing desert Sandoval County, libraryofcongress, CC0 1.0, licence: https://creativecommons.org/publicdomain/zero/1.0/, source: https://www.rawpixel.com/image/12151006/image-cloud-plant-art
* local chapter hall Veterans Foreign, Carol M Highsmith, CC0 1.0, licence: https://creativecommons.org/publicdomain/zero/1.0/, source: https://www.rawpixel.com/image/8079773/photo-image-cloud-sky-american-flag
* What's in your glove box?, karmatosed (Tammie Lister), CC0 1.0, licence: https://creativecommons.org/publicdomain/zero/1.0/, source: https://www.flickr.com/photos/73631307@N00/2096516382
* Secured Glovebox, cogdogblog (Alan Levine), CC0 1.0, licence: https://creativecommons.org/publicdomain/zero/1.0/, source: https://www.flickr.com/photos/37996646802@N01/33213363108

All bundled theme code and original theme design are distributed under GPLv2 or later.

Portions of this theme were developed with AI assistance (Anthropic Claude, via Claude Code) under maintainer direction and review.
