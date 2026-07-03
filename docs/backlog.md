# Dirtbag backlog

Planned checks and improvements for future WordPress.org releases, static-demo refreshes, and maintenance work after the initial directory acceptance.

## Release QA

1. **Official Theme Check pass**
   - Run the WordPress Theme Check plugin against Dirtbag.
   - Treat required errors as release blockers.
   - Record any recommended warnings that are intentionally accepted.

2. **Browser-mode style picker regression**
   - Use a fresh browser-capable `codex-browser` or `codex-browser-handoff` session, or do a manual Site Editor pass.
   - Switch through Default, Minimalist, Newspaper, Hi-vis, Amber CRT, Terminal, and Blueprint several times.
   - Verify the truck icon colour changes correctly and does not stick between styles.
   - Verify no old hover, active-nav, or random colour CSS returns.

3. **Small viewport screenshots**
   - Capture and review at least `240×320`, `320×240`, and `360×640`.
   - Check reading flow, navigation, site logo, featured images, comments, and forms.
   - Confirm there is no accidental horizontal scrolling.

4. **Keyboard and focus pass**
   - Test skip link, primary navigation, mobile overlay menu, footer links, search, comments, buttons, and forms.
   - Confirm focus is visible and tab order follows the page.
   - Confirm there are no keyboard traps.

5. **Rendered HTML validation**
   - Validate home, single, page, archive, search, 404, and comments with the W3C/Nu checker.
   - Record any unavoidable WordPress/core output notes separately from theme issues.

6. **Axe/pa11y accessibility checks**
   - Run automated checks in a browser-capable session.
   - Follow with manual keyboard and screen-reader spot checks.

7. **Clean-install verification**
   - Confirm the theme renders correctly for a brand-new user with no database overrides.
   - Use a Playground link (which reseeds from a blank install on every load) or a **throwaway** Studio site — never reset the main authoring site.
   - For a full wipe + reseed, first re-export current Studio content into `playground/seed-content.php`; the seed file is derived from Studio, not the reverse. See [development guide](development.md#studio-site-demo-content-and-reseeding).

8. **JavaScript-off fallback pass**
   - "No theme JavaScript" is not the test; the test is what survives when scripts do not run. If a core block or enhancement Dirtbag opts into loads JS, document the fallback and verify it with scripts disabled or unavailable.
   - Cover the navigation overlay (menu reachable / page navigable without it), enhanced query pagination (links still paginate), and the image lightbox (images remain plain images).
   - Confirm each degrades to a useful document — a plain link, button, image, or full page — not a dead control.

## Tooling improvements

- Keep `bin/package-check` tiny, dependency-free, and easy to rerun.
- **Bake the reconcile into the export step (long-term fix).** A raw Site-Editor export reintroduces artifacts the reconcile strips (the `core/post-data` datetime binding, hardcoded `"theme":"dirtbag"` slugs, absolute `localhost` URLs). `bin/package-check` now *fails* when these reappear (short-term guardrail), but the durable fix is a Studio→repo export helper that applies the reconcile automatically so the artifacts never land in committed files.
- Consider adding optional checks for stale text-domain strings and pattern translation coverage.
- Consider a release packaging helper that creates a clean `dirtbag.zip` without development files.
- Consider a browser-mode regression script for the style picker if browser tooling becomes part of the normal workflow.

## Documentation improvements

- Add screenshots for every style variation.
- Add a short maintainer note for refreshing `languages/dirtbag.pot`.
- Add a WordPress Playground blueprint if it can stay simple and does not become a build step.

## Future experiments

- **Private note tool**
  - Do not ship `single-note.html` in v1 unless a real `note` post type or companion plugin backs it.
  - Explore a private-first note/scratch-pad tool later, possibly with a clearly labelled `contenteditable` area.
  - Define persistence, privacy, accessibility, keyboard, and screen-reader behaviour before adding any public template surface.
  - Avoid app-like machinery in the theme; use a companion plugin if saving or private dashboard behaviour is needed.

- **Amber/orange truck icon on Terminal and Hi-Vis**
  - Try the amber/orange `truckIconFilter` (the value Amber CRT and Blueprint already use) on the **Terminal** and **Hi-Vis** styles. It looked good in passing. This only affects the in-page header logo; the browser-tab favicon is decoupled (opaque site icon) and is unaffected. Scope is tiny: edit `truckIconFilter` in `styles/terminal.json` (currently green) and `styles/hi-vis.json` (currently `none`, i.e. dark).
  - **Terminal (amber truck on black)**
    - Pro: amber-on-black is itself a classic CRT look (amber phosphor), so it reads as deliberate; warm/rusty tones suit a dirt truck better than acid green; strong contrast on pure black.
    - Con: Terminal's palette is monochrome green by design — a non-green logo breaks that single-hue discipline and can look like a stray, un-themed element.
    - Con: it visually collides with the **Amber CRT** style, whose identity *is* amber-on-black; sharing the amber truck blurs the Terminal vs Amber CRT distinction.
  - **Hi-Vis (orange truck on yellow)**
    - Pro: orange + yellow is a genuine safety/hi-vis pairing (hazard tape, cones); adds a warm focal accent to an otherwise flat yellow/black style.
    - Con: contrast regression — Hi-Vis's whole premise is maximum legibility, and black-on-yellow (current) is near-max contrast; orange-on-yellow is markedly lower and undercuts the style's own accessibility selling point.
    - Con: the amber filter was tuned against black backgrounds; on yellow it may look muddy or vibrate and likely needs a different orange.
  - **If pursued:** re-check logo contrast on each affected style at small sizes, and re-run the style-picker "colour does not stick between styles" regression (Release QA item 2). Tentative lean: keep **Hi-Vis dark** for contrast integrity; amber on **Terminal** is worth an A/B, accepting (or otherwise resolving) the overlap with Amber CRT.

## Compatibility notes

- **Breadcrumbs and WordPress 7.0**
  - Dirtbag v1 targets WordPress 7.0+ so it can use the core Breadcrumbs block.
  - If a future release lowers the minimum WordPress version, remove or conditionally replace `core/breadcrumbs` first.

## Browser testing (future Playwright / manual)

Not yet verified in a real browser; looked OK on a quick manual skim.

- **Mobile navigation overlay — open/close and centering**
  - Tap the header menu icon on small viewports; confirm the overlay opens, the `core/navigation-overlay-close` button closes it, Esc closes it, and focus is trapped while open.
  - Confirm the site logo and the menu are visually centred (`parts/navigation-overlay.html`).
- **Mobile navigation overlay — dark style variations**
  - The overlay uses fixed `#ffffff` background / `#000000` text so it always renders solid. On dark variations (Terminal, Amber CRT, Blueprint) that is a light panel over a dark site.
  - Verify contrast and appearance there, and decide whether the overlay should follow each variation's colours instead of fixed black/white.

## Static site / GitHub Pages

- **Automate the GitHub Pages export in CI**
  - The live demo at `dknauss.github.io/dirtbag` is currently built and deployed by hand from the Studio site — see [github-pages-static-export.md](github-pages-static-export.md).
  - Replace the Studio dependency with a release-triggered workflow: boot the theme + seed from `playground/blueprint-stable.json` using `@wp-playground/cli`, install Simply Static, run `bin/static-export/export.php` and `bin/static-export/supplement.sh`, then publish with `actions/deploy-pages` (or push to `gh-pages`).
  - Open questions: whether Simply Static's loopback crawl works against `wp-playground/cli`'s built-in server in CI, and whether to trigger on tag/release only or also on `main`.
- **Replace dynamic search with a static index**
  - Site search returns nothing on the static host (no backend). Consider a client-side index such as Pagefind, built as a post-crawl step.
