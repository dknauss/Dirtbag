# Gutenberg #79380 — lightbox trigger button has no accessible name without JavaScript

**Status:** SUPERSEDED — reserve patch retired, do not submit. On 2026-06-23 a
maintainer (`talldan`) triaged the issue as a confirmed `[Type] Bug` / `[Block] Image`,
and `thisismyurl` opened [WordPress/gutenberg#79440](https://github.com/WordPress/gutenberg/pull/79440)
implementing this exact fix — a static `aria-label="Enlarge"` in
`block_core_image_render_lightbox()`, matched to the `triggerButtonAriaLabel` default,
plus a PHPUnit regression test — though that test was later removed (see the follow-up
below), so the fix currently ships untested. Our patch below is kept for provenance
only; back #79440 rather than opening a duplicate PR. The theme-side fallback
(`dirtbag_lightbox_trigger_label`, 0.1.12) stays until #79440 merges upstream.

- Issue: <https://github.com/WordPress/gutenberg/issues/79380>
- Upstream PR (supersedes this): <https://github.com/WordPress/gutenberg/pull/79440>
- Patch (historical): [`gutenberg-79380-lightbox-button-name.patch`](gutenberg-79380-lightbox-button-name.patch)
- Theme-side fallback already shipped: `functions.php` (`dirtbag_lightbox_trigger_label`, 0.1.12)

## 2026-07-14 follow-up — test coverage gap flagged upstream

On 2026-07-08 `thisismyurl` **removed** the PHPUnit regression test
([CI-fix comment](https://github.com/WordPress/gutenberg/pull/79440#issuecomment-4915535190)):
in the Gutenberg test environment WP Core defines `block_core_image_render_lightbox()`
first, and the plugin's copy is skipped behind `function_exists()`, so the test
exercised the un-fixed Core function and failed regardless. The diagnosis is correct —
but it leaves the fix with no regression coverage, and the accompanying claim that
Playwright covers it does not hold: the E2E suite runs hydrated, so it only ever sees
the runtime-bound `aria-label`, never the static server-rendered fallback this fix adds.

Dan flagged this on the PR
([comment](https://github.com/WordPress/gutenberg/pull/79440#issuecomment-4969784312),
2026-07-14) with two ways to close the gap: a
`gutenberg_block_core_image_render_lightbox()` alias the unit test can call directly
(sidestepping the Core shadowing), or a Playwright case with `javaScriptEnabled: false`
asserting the trigger has an accessible name from the static HTML. Non-blocking; the
change itself is right.

## The problem

Core renders the image lightbox trigger as a bare
`<button class="lightbox-trigger">` whose accessible name comes only from the
Interactivity API at runtime (`data-wp-bind--aria-label="state.thisImage.triggerButtonAriaLabel"`).
With JavaScript off, or before hydration, the button has no accessible name and
fails the WCAG 4.1.2 `button-name` check.

This is **not** the same as [#78426](https://github.com/WordPress/gutenberg/pull/78426),
which restored the label — but via that same runtime binding. The server-rendered
HTML still ships without a name.

## The fix

`block_core_image_render_lightbox()` in
`packages/block-library/src/image/index.php` builds the button as a heredoc
string. The patch adds a **static** `aria-label` to that markup, reusing the exact
label already stored in the Interactivity state (`triggerButtonAriaLabel => __( 'Enlarge' )`):

```php
$trigger_button_aria_label = esc_attr__( 'Enlarge' );
// ...
. '<button
    class="lightbox-trigger"
    type="button"
    aria-haspopup="dialog"
    aria-label="' . $trigger_button_aria_label . '"
    data-wp-bind--aria-label="state.thisImage.triggerButtonAriaLabel"
    ...'
```

JS-off and pre-hydration now have a name ("Enlarge"); hydration still applies the
bound value (also "Enlarge"), so behaviour with JS is unchanged. No new strings —
`Enlarge` is already translated for the runtime label.

## Test to include with the PR

Extend the image-block render coverage (e.g.
`phpunit/blocks/render-block-core-image.php`, or wherever the lightbox render is
tested) with an assertion that the static name is present:

```php
public function test_lightbox_trigger_has_static_aria_label() {
    $content = do_blocks(
        '<!-- wp:image {"id":1,"lightbox":{"enabled":true}} -->' .
        '<figure class="wp-block-image"><img src="https://example.com/x.jpg" alt="x" class="wp-image-1"/></figure>' .
        '<!-- /wp:image -->'
    );

    // The trigger carries a static accessible name (not only the runtime binding).
    $this->assertMatchesRegularExpression(
        '/<button[^>]*class="lightbox-trigger"[^>]*aria-label="Enlarge"/s',
        $content
    );
    // The runtime binding is still present so JS can refine the label.
    $this->assertStringContainsString( 'data-wp-bind--aria-label="state.thisImage.triggerButtonAriaLabel"', $content );
}
```

## Turning this into a PR — no longer applicable

The steps below are retained for the record. **Do not run them** — PR
[#79440](https://github.com/WordPress/gutenberg/pull/79440) already lands this fix
upstream, so applying this patch would produce a duplicate PR. If #79440 stalls or
is closed without merging, revisit these steps.

1. `git clone https://github.com/WordPress/gutenberg && cd gutenberg && npm ci`
2. `git apply ../dirtbag/docs/repro/gutenberg-79380-lightbox-button-name.patch`
   (the patch is rooted at the repo top, `a/packages/...`).
3. Add the test above; run `npm run test:unit:php -- --filter lightbox` (or the
   project's current PHP test command).
4. Open the PR against `trunk`, referencing #79380, with a one-line summary:
   "Image: give the lightbox trigger a static aria-label for the no-JS /
   pre-hydration state."
5. No self-prop; credit per the project's contributor-attribution norms.

If the maintainers prefer the runtime-only approach (the #78426 stance), the
theme-side fallback stays as the local fix and this patch is retired.
