# WordPress contribution notes

Dirtbag is a small theme, but it keeps running into the same kinds of WordPress
problems: tiny text transformations, plain-CSS layout assumptions, admin messages
that promise too much, and security code paths where the boring edge case matters.
This note collects Dan Knauss / `dpknauss` WordPress contributions that have the
same character.

Sources checked: the public [`dpknauss` WordPress.org profile activity timeline](https://profiles.wordpress.org/dpknauss/),
GitHub searches for `dknauss`, linked GitHub/Trac items, and the Liquid Web
article [Apostrophes and Quotation Marks](https://www.liquidweb.com/blog/apostrophes-and-quotation-marks/).
This is a practical inventory, not a complete archaeological audit of every
historic Trac comment.

## Highlights

### Shipped or core-adjacent code changes

- [WordPress core changeset 61854](https://core.trac.wordpress.org/changeset/61854/)
  from [Core Trac #64690](https://core.trac.wordpress.org/ticket/64690): improved
  the admin error message shown when a bulk role change skips the current user.
  This is the cleanest “went into core” item found in the profile timeline.
- [WordPress/wordpress-develop#2816](https://github.com/WordPress/wordpress-develop/pull/2816):
  fixed the `do_action()` docblock example so it no longer implies a return value.
- [WordPress/wordpress-develop#12209](https://github.com/WordPress/wordpress-develop/pull/12209):
  proposed changing the maintenance-mode message from “Check back in a minute.”
  to “Check back shortly.” The point is small but important: do not make a timed
  promise the software cannot keep.
- [WordPress/gutenberg#67711](https://github.com/WordPress/gutenberg/pull/67711):
  merged spelling, grammar, and clarity corrections in the DataViews package docs.
- [WordPress/two-factor#917](https://github.com/WordPress/two-factor/pull/917)
  (open; rebased reopen of [#859](https://github.com/WordPress/two-factor/pull/859),
  which was closed by accident on 2026-06-14): moves the Two Factor plugin's
  rate-limit gate before provider preprocessing and invalidated provider tokens when
  the delay fires. This superseded the narrower
  [#848](https://github.com/WordPress/two-factor/pull/848) fix for email resend.
- [WordPress/two-factor#877](https://github.com/WordPress/two-factor/pull/877):
  **merged 2026-06-29** — fails closed when `random_bytes()` is unavailable during
  login nonce generation, replacing a weak legacy fallback.

### Interesting reports and design questions

- [WordPress/gutenberg#79372](https://github.com/WordPress/gutenberg/issues/79372):
  Post Title block links are `display: inline-block`, which makes the whole title
  an atomic inline-level box. In narrow float / `shape-outside` layouts, the title
  can drop below a floated thumbnail instead of wrapping beside and under it.
  After the archaeology comment confirmed the `inline-block` is editor-only (from
  #30666), a contributor invited a PR;
  [WordPress/gutenberg#80231](https://github.com/WordPress/gutenberg/pull/80231)
  is **open** (2026-07-14) — moves `display: inline-block` into an editor-only
  `post-title/editor.scss` so the front-end link wraps around floats.
- [WordPress/gutenberg#79380](https://github.com/WordPress/gutenberg/issues/79380):
  the image lightbox trigger button is server-rendered with no static accessible
  name — its `aria-label` is supplied only at runtime by the Interactivity API
  (`data-wp-bind--aria-label`, restored in #78426), so it fails `button-name` with
  JavaScript off or before hydration. Dirtbag ships a static-`aria-label` fallback
  (`functions.php`, 0.1.12). A maintainer triaged the issue, and the same static-label
  fix is now proposed upstream in
  [WordPress/gutenberg#79440](https://github.com/WordPress/gutenberg/pull/79440)
  (opened independently); Dirtbag backs that PR rather than filing a duplicate.
- [WordPress/gutenberg#42345](https://github.com/WordPress/gutenberg/issues/42345):
  single quotes after bold text can be curled the wrong way on output. This is the
  `wptexturize()` / old core-text-filter problem described below.
- [WordPress/two-factor#847](https://github.com/WordPress/two-factor/issues/847):
  email resend bypassed the 2FA retry delay because resend lived in provider
  preprocessing, before the central rate-limit check.
- [WordPress/two-factor#860](https://github.com/WordPress/two-factor/issues/860):
  `create_login_nonce()` had an old weak fallback for unavailable CSPRNG output.
- [WordPress/two-factor#796](https://github.com/WordPress/two-factor/issues/796)
  and [#797](https://github.com/WordPress/two-factor/issues/797): TOTP setup could
  produce inconsistent provider state, causing a quiet fallback to backup codes.

### Documentation / handbook work

- [WordPress/Advanced-administration-handbook#485](https://github.com/WordPress/Advanced-administration-handbook/pull/485):
  clarified `WP_CACHE`, `advanced-cache.php`, persistent object caching, transients,
  and related performance constants.
- [WordPress/Advanced-administration-handbook#366](https://github.com/WordPress/Advanced-administration-handbook/pull/366):
  corrected and expanded the users and roles documentation.
- [WordPress/Advanced-administration-handbook#344](https://github.com/WordPress/Advanced-administration-handbook/pull/344):
  refreshed and reorganized the hardening guide resources.
- [WordPress/Security-White-Paper#88](https://github.com/WordPress/Security-White-Paper/pull/88)
  and [#89](https://github.com/WordPress/Security-White-Paper/pull/89): updated
  the OWASP Top 10 section.
- [WordPress/Security-White-Paper#90](https://github.com/WordPress/Security-White-Paper/pull/90):
  added a transport security / HTTPS section.
- [WordPress/Security-White-Paper#91](https://github.com/WordPress/Security-White-Paper/pull/91):
  added a section on HTML and JavaScript in post content.
- [WordPress/Security-White-Paper#92](https://github.com/WordPress/Security-White-Paper/issues/92):
  proposed a source-first publication pipeline for HTML, PDF, translations, and
  LLM-produced artifacts.
- [WordPress/wp20-book#10](https://github.com/WordPress/wp20-book/pull/10): fixed
  an incorrect personal pronoun in the WordPress 20th-anniversary book.
- [WordPress/Documentation-Issue-Tracker#440](https://github.com/WordPress/Documentation-Issue-Tracker/issues/440):
  requested consistent naming for the Navigation Block and Submenu Navigation Child
  Blocks.
- [WordPress/Documentation-Issue-Tracker#1817](https://github.com/WordPress/Documentation-Issue-Tracker/issues/1817):
  contributed replacement content for the HelpHub "E-mail Address" / changing-the-admin-email
  guide. **Merged and closed `[Status] Done` (2026-07-03)** — an editor applied the
  content and refreshed the main screenshot.

### Other WordPress ecosystem items

- [WordPress/wordpress-playground#3875](https://github.com/WordPress/wordpress-playground/issues/3875):
  reported that `git:directory` package installs fail in the browser Playground with
  `createHash is not a function` — the Node `isomorphic-git` path leaking into the
  browser bundle after #3841. Dirtbag hit this building its theme-test blueprint and
  worked around it by installing the theme ZIP through the CORS proxy instead
  (repo #102 / #103). The report triggered a same-night fix: adamziel's first pass
  [#3879](https://github.com/WordPress/wordpress-playground/pull/3879) (closed) was
  consolidated into ashfame's
  [#3882](https://github.com/WordPress/wordpress-playground/pull/3882) (open, the live
  fix) — a shared Vite helper aliasing `isomorphic-git` to its browser ESM entry
  across all browser-facing packages, plus a Playwright `git:directory` regression
  test against a local Git fixture and a localhost CORS-proxy bypass. `Fixes #3875`.
  Verified 2026-07-04: a `git:directory` `installTheme` of `dknauss/dirtbag` clones and
  activates cleanly on the #3882 preview build (`playground.wordpress.net/?pr=3882`) —
  no `createHash` error. The Dirtbag CORS-proxy ZIP workaround is retirable once #3882
  merges and deploys to production; switch `blueprint-theme-test.json` back to
  `git:directory` then.
- [WordPress/agent-skills#32](https://github.com/WordPress/agent-skills/pull/32):
  added `studio` and `studio-xdebug` skills.
- [WordPress/agent-skills#35](https://github.com/WordPress/agent-skills/pull/35):
  added an `AGENTS.md` generator script.
- [WordPress/wordcamp.org#1510](https://github.com/WordPress/wordcamp.org/issues/1510):
  noted that Canadian visa request letters should follow Canadian federal guidance.
- [Core Trac #28491](https://core.trac.wordpress.org/ticket/28491): reported that
  only local image uploads were possible with the Customizer.
- bbPress Trac #2347: reported that the phpBB importer conflated all deactivated
  users as a single anonymous user.

## The most Dirtbag-shaped contributions

These are the ones that feel closest to the theme's philosophy: plain output,
honest wording, small CSS/HTML details, and no magical explanations.

1. [Gutenberg #42345](https://github.com/WordPress/gutenberg/issues/42345) — a
   single quote after bold text curls the wrong way.
2. [Gutenberg #79372](https://github.com/WordPress/gutenberg/issues/79372) — a core
   block style turns a normal title link into an atomic inline box, breaking a
   magazine-style float pattern.
3. [wordpress-develop #12209](https://github.com/WordPress/wordpress-develop/pull/12209) —
   maintenance mode should say “shortly,” not “in a minute,” because the software
   does not know it will be one minute.
4. [Core #64690 / changeset 61854](https://core.trac.wordpress.org/changeset/61854/) —
   an admin message should explain the actual thing that happened.
5. [Advanced Administration Handbook #485](https://github.com/WordPress/Advanced-administration-handbook/pull/485) —
   `WP_CACHE` and object caching should be explained as the boring moving parts
   they are, not as a vague performance charm.

## Deep dive: the single-quote / `wptexturize()` issue

Issue: [WordPress/gutenberg#42345](https://github.com/WordPress/gutenberg/issues/42345)
was filed as a Gutenberg issue, but the closing comment correctly points to core:
this belongs to `wptexturize()` and the older core ticket
[Core Trac #18549](https://core.trac.wordpress.org/ticket/18549). Dan's Liquid
Web post [Apostrophes and Quotation Marks](https://www.liquidweb.com/blog/apostrophes-and-quotation-marks/)
is useful background because it makes the typography side explicit: the desired
character for English contractions and possessives is U+2019 RIGHT SINGLE
QUOTATION MARK, not ASCII `'` and not U+2018 LEFT SINGLE QUOTATION MARK.

### Symptom

In editor content, start with straight ASCII punctuation around an inline-formatted
word, for example:

```html
<strong>He</strong>'s here.
```

The Liquid Web article shows the same minimal shape with `strong` and `em` tags:

```html
<strong>Test</strong>'s
<em>Test</em>'s
```

One copied snippet in that post appears to have a small typo —
`<strong>Test<strong>'s` is missing the slash in the closing `</strong>` tag. The
intended case is a closing inline tag immediately followed by a straight
apostrophe.

On the frontend, WordPress runs `wptexturize()` over post content. The desired output
is:

```html
<strong>He</strong>&#8217;s here.
```

That is U+2019, the right single quotation mark / apostrophe.

The bad output is:

```html
<strong>He</strong>&#8216;s here.
```

That is U+2018, the left single quotation mark. In some fonts the difference is hard
to see; in others it is obvious.

### Why it happens

`wptexturize()` does not process the whole HTML string as one text node. It first
splits the content into text runs and HTML delimiters. A simplified version of the
input becomes:

```text
<strong> | He | </strong> | 's here.
```

The final text run starts with `'s`. Because the quote is now at the beginning of its
run, the opening-single-quote rule wins:

```php
// Single quote at start, or preceded by (, {, <, [, ", -, or spaces.
$dynamic[ '/(?<=\A|[([{"\-]|&lt;|' . $spaces . ')\'/' ] = $open_sq_flag;
```

The later “apostrophe in a word” rule cannot see that the previous visible character
was the `e` inside `<strong>He</strong>`:

```php
// Apostrophe in a word. No spaces, double apostrophes, or other punctuation.
$dynamic[ '/(?<!' . $spaces . ')\'(?!\Z|[.,:;!?"\'(){}[\]\-]|&[lg]t;|' . $spaces . ')/' ] = $apos_flag;
```

Inside one text run, `test's` is handled correctly. Across inline HTML boundaries,
the context is lost.

### Is it fixable?

Yes, but the safe fix belongs in WordPress core, not Gutenberg and not Dirtbag.
Dirtbag can document it or opt out locally, but a theme should not patch
`wptexturize()` globally for every site.

A plausible core fix is to make `wptexturize()` context-aware across inline HTML
boundaries. In plain English:

- when a text run begins with `'` followed by a letter or number;
- and the immediately previous output ended with a closing inline tag;
- and the visible text before that closing tag ended with a letter or number;
- then treat the quote as an apostrophe (`&#8217;`), not an opening single quote.

The regression test would look roughly like this:

```php
/**
 * @ticket 18549
 */
public function test_apostrophe_after_inline_formatting_tag() {
    $this->assertSame(
        '<strong>He</strong>&#8217;s here.',
        wptexturize( "<strong>He</strong>'s here." )
    );
}
```

Useful additional cases:

```php
'<em>It</em>\'s fine.'        => '<em>It</em>&#8217;s fine.'
'<a href="#">Dan</a>\'s car' => '<a href="#">Dan</a>&#8217;s car'
'<strong>rock</strong>\'n\'roll' => '<strong>rock</strong>&#8217;n&#8217;roll'
'&<strong>x</strong>\'s' => '&#038;<strong>x</strong>&#8217;s'
```

The hard part is preserving legitimate opening quotes after markup. These should not
be blindly changed:

```php
'<strong>Note:</strong> \'quoted text\''
'<strong>He said</strong> \'go\''
```

The key distinction is adjacency: no space between the closing inline tag and the
apostrophe suggests a contraction or possessive; a space suggests normal quotation
syntax.

### What Dirtbag can do today

Dirtbag should probably not disable `wptexturize()` site-wide. That would change
quotes, dashes, ellipses, primes, and other long-standing WordPress output behavior.
It is too broad for a theme whose goal is to stay small and native.

For a site-specific workaround, a plugin or mu-plugin can disable texturization:

```php
add_filter( 'run_wptexturize', '__return_false' );
```

That is blunt. A narrower workaround can filter rendered content after WordPress has
texturized it, but only for carefully chosen patterns. For example, this is a sketch,
not a theme recommendation:

```php
add_filter( 'the_content', function ( $content ) {
    return preg_replace(
        '/(<\/(?:a|abbr|b|cite|code|em|i|mark|small|span|strong)>)(?:&#8216;)(?=[[:alnum:]])/u',
        '$1&#8217;',
        $content
    );
}, 12 );
```

That patch is intentionally conservative: it only flips a left single quote
immediately after a closing inline tag when an alphanumeric character follows. It
still needs real test coverage before use.

### Recommendation

Revive this upstream in core against
[Trac #18549](https://core.trac.wordpress.org/ticket/18549), with unit tests in
`tests/phpunit/tests/formatting/wpTexturize.php`. The desired change is not “turn off
smart quotes.” It is “do not lose word context across inline formatting tags.”

A **minimal** trunk / WordPress 7.0-compatible patch is drafted in
[`repro/wptexturize-18549-7.0-compat.patch`](repro/wptexturize-18549-7.0-compat.patch).
It fixes the possessive/contraction case immediately after closing inline tags, but
it does not attempt to replace the broader historical #18549 patch attempts. The
inline-tag list intentionally excludes `kbd`, because core treats `kbd` as a
no-texturize tag, and excludes deprecated `acronym`. The patch was validated
against a fresh `wordpress-develop` trunk checkout (`e269998`) with the full
`Tests_Formatting_wpTexturize` class passing: 359 tests, 447 assertions. A
plugin-style compatibility workaround is also sketched in
[`repro/wptexturize-18549-compat-plugin.php`](repro/wptexturize-18549-compat-plugin.php).

A separate **comprehensive** compatibility pass inventories the older Trac patches and
snippets in
[`repro/wptexturize-18549-historic-inventory.md`](repro/wptexturize-18549-historic-inventory.md),
with a comprehensive but still bounded core patch in
[`repro/wptexturize-18549-historic-compat.patch`](repro/wptexturize-18549-historic-compat.patch)
and a rendered-content prototype plugin in
[`repro/wptexturize-18549-historic-compat-plugin.php`](repro/wptexturize-18549-historic-compat-plugin.php).
The comprehensive patch normalizes the historical closing-quote-after-inline-tag tests while
preserving the current full `Tests_Formatting_wpTexturize` suite.

**Status — submitted (2026-06-20).** The comprehensive patch is posted to Trac
([comment:37](https://core.trac.wordpress.org/ticket/18549#comment:37)) and opened as
[wordpress-develop PR #12249](https://github.com/WordPress/wordpress-develop/pull/12249)
(`src/wp-includes/formatting.php` + the `wpTexturize` tests). It is green on current trunk
(`OK (361 tests, 469 assertions)`) and PHPCS-clean against the WordPress-Core ruleset; the
minimal patch remains available as a narrower fallback. Full review, attachment dig, and
performance analysis: [`repro/wptexturize-18549-review-and-performance.md`](repro/wptexturize-18549-review-and-performance.md).

**Standalone stopgap plugin.** The fix also ships as a separate, removable plugin —
[dknauss/wp-texturize-inline-quote-fix](https://github.com/dknauss/wp-texturize-inline-quote-fix) —
in two builds. A lightweight **post-process** plugin flips the mis-curled quote on
rendered output (tiny, drift-free, approximate on a couple of edge cases). A
**faithful** plugin replaces `wptexturize()` with a forked WordPress 7.0 copy carrying
the comprehensive patch, matching PR #12249 byte-for-byte — verified on WP 7.0 with the
#18549 fixtures corrected and a corpus of ordinary text byte-identical to core's
`wptexturize()`. Use one or the other; both are temporary, to remove once #18549 lands.

The Trac revival comment (now posted):

> This is still visible in current block-editor workflows and came up again in
> [Gutenberg #42345](https://github.com/WordPress/gutenberg/issues/42345). The
> Gutenberg report was closed correctly as a core `wptexturize()` issue. A useful
> modern minimal case is a possessive or contraction immediately after an inline
> formatting tag:
>
> ```html
> <strong>He</strong>'s here.
> <em>Test</em>'s
> ```
>
> The desired output is U+2019 / `&#8217;`, but `wptexturize()` treats the apostrophe
> as an opening single quote because the text run after the closing inline tag
> starts at `'s`. This is the same context-loss problem described in the original
> ticket: `wptexturize()` has split the visible word across an HTML boundary.
>
> A minimal regression test would help keep this ticket actionable even if the
> older comprehensive patch attempts need refresh:
>
> ```php
> /**
>  * @ticket 18549
>  */
> public function test_apostrophe_after_inline_formatting_tag() {
>     $this->assertSame(
>         '<strong>He</strong>&#8217;s here.',
>         wptexturize( "<strong>He</strong>'s here." )
>     );
> }
> ```
>
> The likely rule distinction is adjacency: a closing inline tag immediately
> followed by `'` and an alphanumeric character should be eligible for apostrophe
> handling when the previous visible character before the tag is also
> alphanumeric. A space after the closing tag should remain available for normal
> opening-quote behavior.
>
> Also noting the public explainer at
> <https://www.liquidweb.com/blog/apostrophes-and-quotation-marks/>. One snippet
> there appears to have a typo (`<strong>Test<strong>'s`, missing the slash in the
> closing tag), but the intended repro is clear: a closing inline tag immediately
> followed by a straight apostrophe.

For Dirtbag itself, leave `wptexturize()` alone and treat this as documentation / blog
material unless the site starts publishing examples where the bug is visible enough
to matter.
