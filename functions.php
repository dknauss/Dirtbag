<?php
/**
 * Dirtbag theme functions.
 *
 * Dirtbag is deliberately code-light: it ships no theme-authored JavaScript and
 * leans on core block templates. The only PHP behaviour lives here.
 *
 * @package Dirtbag
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! function_exists( 'dirtbag_site_logo_fallback' ) ) {
	/**
	 * Show the bundled pickup-truck mark when no Site Logo has been set.
	 *
	 * The header uses the core Site Logo block, which renders nothing on the
	 * front end until a logo is uploaded — so a fresh install (or the generic
	 * WordPress.org directory preview, which never runs the theme's demo seed)
	 * falls back to the plain site title. This filter fills that gap with the
	 * theme's own SVG truck, sized to the block's width and wrapped in the same
	 * markup core uses, so existing styles (including the dark-mode icon filter)
	 * apply unchanged.
	 *
	 * It only acts when the site has no logo of its own: an uploaded Site Logo,
	 * or a Site Icon when the block is set to sync with it, both take precedence.
	 *
	 * @param string $block_content Rendered block HTML.
	 * @param array  $block         Parsed block, including attributes.
	 * @return string Original content, or the truck fallback when no logo is set.
	 */
	function dirtbag_site_logo_fallback( $block_content, $block ) {
		if ( empty( $block['blockName'] ) || 'core/site-logo' !== $block['blockName'] ) {
			return $block_content;
		}

		// A real Site Logo wins.
		if ( get_theme_mod( 'custom_logo' ) ) {
			return $block_content;
		}

		$attrs = isset( $block['attrs'] ) ? $block['attrs'] : array();

		// A synced Site Icon also wins, since core renders it as the logo.
		if ( ! empty( $attrs['shouldSyncIcon'] ) && get_option( 'site_icon' ) ) {
			return $block_content;
		}

		$src = get_theme_file_uri( 'assets/icons/pickup-truck-header.svg' );
		if ( ! is_readable( get_theme_file_path( 'assets/icons/pickup-truck-header.svg' ) ) ) {
			return $block_content;
		}

		$width      = isset( $attrs['width'] ) ? (int) $attrs['width'] : 0;
		$is_link    = ! isset( $attrs['isLink'] ) || $block['attrs']['isLink'];
		$wrap_class = 'wp-block-site-logo';
		if ( ! empty( $attrs['className'] ) ) {
			$wrap_class .= ' ' . $attrs['className'];
		}

		$img = sprintf(
			'<img class="custom-logo" src="%1$s" alt="%2$s"%3$s decoding="async" />',
			esc_url( $src ),
			esc_attr( get_bloginfo( 'name', 'display' ) ),
			$width ? ' width="' . $width . '"' : ''
		);

		if ( $is_link ) {
			$img = sprintf(
				'<a href="%1$s" class="custom-logo-link" rel="home">%2$s</a>',
				esc_url( home_url( '/' ) ),
				$img
			);
		}

		return sprintf( '<div class="%1$s">%2$s</div>', esc_attr( $wrap_class ), $img );
	}
}
add_filter( 'render_block', 'dirtbag_site_logo_fallback', 10, 2 );

if ( ! function_exists( 'dirtbag_theme_root_custom_css' ) ) {
	/**
	 * The theme's own root custom CSS, as declared in theme.json `styles.css`.
	 *
	 * Read through the resolver rather than the file so a child theme's and a
	 * style variation's contributions are included, and cached for the request.
	 *
	 * @return string Root custom CSS, or '' if the theme declares none.
	 */
	function dirtbag_theme_root_custom_css() {
		static $css      = null;
		static $resolving = false;

		if ( null !== $css ) {
			return $css;
		}

		/*
		 * get_theme_data() fires `wp_theme_json_data_theme`; if some other
		 * extender's callback reaches back into the user data, this function is
		 * re-entered before the static is set. Bail rather than recurse.
		 */
		if ( $resolving ) {
			return '';
		}

		/*
		 * get_theme_data() returns a WP_Theme_JSON (the WP_Theme_JSON_Data wrapper
		 * is transient, around the filter above). get_raw_data(), not get_data():
		 * the latter flattens presets across origins and rewrites opt-ins as
		 * appearanceTools, where we want the `styles.css` string exactly as the
		 * theme authored it.
		 */
		$resolving = true;
		$raw       = WP_Theme_JSON_Resolver::get_theme_data( array(), array( 'with_supports' => false ) )->get_raw_data();
		$resolving = false;

		$css = isset( $raw['styles']['css'] ) ? (string) $raw['styles']['css'] : '';

		return $css;
	}
}

if ( ! function_exists( 'dirtbag_preserve_root_custom_css' ) ) {
	/**
	 * Keep theme.json's root CSS when the user adds their own Additional CSS.
	 *
	 * Dirtbag's `theme.json` carries a root `styles.css` string holding the rules
	 * core settings cannot express: the truck-icon `filter`, the `.front-grid`
	 * subgrid, the sidebar thumbnails, and the gallery caption escape. Core merges
	 * global styles with `array_replace_recursive()`, and because root `styles.css`
	 * is a *string* rather than an array, any other origin that sets it REPLACES
	 * the theme's value instead of appending to it. So a site owner who opened
	 * Site Editor → Styles → Additional CSS and typed one declaration silently
	 * deleted the theme's entire root stylesheet — no error, no obvious cause.
	 *
	 * This re-prepends the theme's CSS to the user layer, so both survive. Order
	 * matters: the theme's rules go first, leaving the user's own CSS last and
	 * therefore winning ties, which is what someone writing Additional CSS expects.
	 *
	 * The rules cannot instead move to per-block `styles.blocks.*.css`, which does
	 * merge per key: core runs that through
	 * `WP_Theme_JSON::process_blocks_custom_css()`, which discards `@supports` and
	 * `@media` wrappers outright and rewrites every selector as `:root :where(…)`,
	 * capping it at 0-1-0 specificity. That would drop the `.front-grid` rule and
	 * leave the gallery caption escape losing to core's own 0-4-0 selector.
	 *
	 * Runs on the user layer only, which is the one that gets clobbered; theme and
	 * variation data are merged before it and are unaffected.
	 *
	 * @param WP_Theme_JSON_Data $theme_json User-origin global styles data.
	 * @return WP_Theme_JSON_Data Data with the theme's root CSS restored.
	 */
	function dirtbag_preserve_root_custom_css( $theme_json ) {
		if ( ! is_object( $theme_json ) || ! method_exists( $theme_json, 'update_with' ) ) {
			return $theme_json;
		}

		$data = $theme_json->get_data();

		/*
		 * Presence of the key is what matters, not whether it holds anything.
		 * array_replace_recursive() replaces on the key, so a `css` of '' or
		 * whitespace wipes the theme's root CSS just as thoroughly as a real rule
		 * does — verified against WP 7.0, where an empty string takes the merged
		 * root CSS from 2152 bytes to 0. Clearing the Additional CSS panel can
		 * leave exactly that, so an `empty()`/`trim()` test here would skip the
		 * repair in one of the cases that most needs it.
		 */
		if ( ! isset( $data['styles']['css'] ) ) {
			return $theme_json;
		}

		$user_css = (string) $data['styles']['css'];

		$theme_css = dirtbag_theme_root_custom_css();
		if ( '' === $theme_css || false !== strpos( $user_css, $theme_css ) ) {
			return $theme_json;
		}

		$combined = '' === $user_css ? $theme_css : $theme_css . "\n" . $user_css;

		return $theme_json->update_with(
			array(
				'version' => isset( $data['version'] ) ? $data['version'] : 3,
				'styles'  => array( 'css' => $combined ),
			)
		);
	}
}
add_filter( 'wp_theme_json_data_user', 'dirtbag_preserve_root_custom_css' );

if ( ! function_exists( 'dirtbag_lightbox_trigger_label' ) ) {
	/**
	 * Give the core image lightbox trigger a static accessible name.
	 *
	 * Core renders the lightbox "enlarge" control as a bare
	 * <button class="lightbox-trigger"> with no text and only a runtime-bound
	 * aria-label (data-wp-bind--aria-label="state.thisImage.triggerButtonAriaLabel").
	 * With JavaScript off — or before the Interactivity API hydrates — the
	 * button therefore has no accessible name and fails the WCAG 4.1.2
	 * "button-name" check. Inject a plain, translatable aria-label so the
	 * control is named in the server-rendered HTML; core's script still
	 * replaces it with the image-specific label once it runs.
	 *
	 * This lets the lightbox stay enabled without tripping the gated
	 * accessibility suite (cf. the 0.1.5 h-card avatar, which instead disabled
	 * the lightbox for the same reason).
	 *
	 * @param string $block_content Rendered block HTML.
	 * @return string Block HTML with a named lightbox trigger.
	 */
	function dirtbag_lightbox_trigger_label( $block_content ) {
		if ( false === strpos( $block_content, 'lightbox-trigger' ) || ! class_exists( 'WP_HTML_Tag_Processor' ) ) {
			return $block_content;
		}
		$processor = new WP_HTML_Tag_Processor( $block_content );
		while ( $processor->next_tag() ) {
			if ( 'BUTTON' === $processor->get_tag()
				&& $processor->has_class( 'lightbox-trigger' )
				&& null === $processor->get_attribute( 'aria-label' )
			) {
				$processor->set_attribute( 'aria-label', __( 'Enlarge image', 'dirtbag' ) );
			}
		}
		return $processor->get_updated_html();
	}
}
// Run on render_block (not render_block_core/image): the lightbox button's
// markup is still in flux while the image block itself renders, but it is final
// HTML once an enclosing block (post-content, group) renders, so match it there.
add_filter( 'render_block', 'dirtbag_lightbox_trigger_label', 20 );

if ( ! function_exists( 'dirtbag_relative_luminance' ) ) {
	/**
	 * Relative luminance of a hex colour, per the WCAG 2.x definition.
	 *
	 * Strict by design: only a literal three- or six-digit hex colour is
	 * accepted. Anything else — `rgb()`, `rgba()`, a named colour, an
	 * unresolved `var()`, or a non-string — returns null so callers can fail
	 * closed rather than guess at a colour they cannot read.
	 *
	 * @param mixed $hex Candidate colour value.
	 * @return float|null Luminance in the range 0–1, or null if not a hex colour.
	 */
	function dirtbag_relative_luminance( $hex ) {
		if ( ! is_string( $hex ) || ! preg_match( '/^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/', $hex ) ) {
			return null;
		}

		$digits = ltrim( $hex, '#' );
		if ( 3 === strlen( $digits ) ) {
			$digits = $digits[0] . $digits[0] . $digits[1] . $digits[1] . $digits[2] . $digits[2];
		}

		$channels = array(
			hexdec( substr( $digits, 0, 2 ) ),
			hexdec( substr( $digits, 2, 2 ) ),
			hexdec( substr( $digits, 4, 2 ) ),
		);

		// sRGB gamma expansion, then the WCAG channel coefficients.
		$coefficients = array( 0.2126, 0.7152, 0.0722 );
		$luminance    = 0.0;
		foreach ( $channels as $i => $value ) {
			$channel     = $value / 255;
			$linear      = ( $channel <= 0.03928 )
				? $channel / 12.92
				: pow( ( $channel + 0.055 ) / 1.055, 2.4 );
			$luminance += $coefficients[ $i ] * $linear;
		}

		return $luminance;
	}
}

if ( ! function_exists( 'dirtbag_color_scheme_for' ) ) {
	/**
	 * Classify a background colour as a CSS `color-scheme` keyword.
	 *
	 * The split is the equal-contrast point against black and white —
	 * sqrt(1.05 * 0.05) - 0.05, about 0.1791 — not an arbitrary midpoint. A
	 * colour above it reads better with dark text (so: a light scheme), below
	 * it with light text. That keeps the answer correct for a background the
	 * site owner picked themselves, which a hardcoded per-variation table
	 * could not.
	 *
	 * @param mixed $background Candidate background colour.
	 * @return string|null 'light', 'dark', or null when the value is not a hex colour.
	 */
	function dirtbag_color_scheme_for( $background ) {
		$luminance = dirtbag_relative_luminance( $background );
		if ( null === $luminance ) {
			return null;
		}

		return ( $luminance > ( sqrt( 1.05 * 0.05 ) - 0.05 ) ) ? 'light' : 'dark';
	}
}

if ( ! function_exists( 'dirtbag_head_color_meta' ) ) {
	/**
	 * Tell the browser what colour this site is.
	 *
	 * WordPress core gives a block theme its doctype, lang, charset, title,
	 * canonical, feed links, robots directives, and the viewport tag
	 * (`_block_template_viewport_meta_tag()`, since 5.8) — but no
	 * `color-scheme` and no `theme-color`. Without the first, form controls,
	 * scrollbars, and spinners render as light user-agent widgets on the dark
	 * variations (Terminal, Amber CRT, Blueprint): a black page with a white
	 * search box.
	 *
	 * The colour is read from the merged global styles rather than a
	 * slug-to-colour map, because WordPress does not persist *which* variation
	 * is active — applying one copies its JSON into the user global-styles
	 * post. Reading the resolved value therefore also picks up the owner's own
	 * Site Editor customisations for free. `styles.color.background` is
	 * additionally the only piece of this that survives core's
	 * `remove_insecure_properties()` on user-origin data, which strips the
	 * whole `settings` tree — so a `settings.custom` convention would not work
	 * here.
	 *
	 * Fails closed: Dirtbag's default Brutalist style deliberately declares no
	 * background at all (it rides the user-agent default), and
	 * `wp_get_global_styles()` returns the *entire* styles array when the
	 * requested path is missing. No declared colour means no claim and no
	 * tags, rather than a guess.
	 *
	 * Note for full-page caches: both tags are site-global and only change when
	 * the global styles do, so a cached page keeps the previous colour until it
	 * is purged.
	 */
	function dirtbag_head_color_meta() {
		$background = wp_get_global_styles(
			array( 'color', 'background' ),
			array( 'transforms' => array( 'resolve-variables' ) )
		);

		// Guard the missing-path case above: without this, the default style
		// hands back an array and the escaping below would fatal.
		if ( ! is_string( $background ) ) {
			return;
		}

		// Whitelist, don't merely escape: this rejects rgb()/rgba(), named
		// colours, and anything that did not resolve to a literal hex.
		$hex = sanitize_hex_color( $background );
		if ( empty( $hex ) ) {
			return;
		}

		$scheme = dirtbag_color_scheme_for( $hex );
		if ( null === $scheme ) {
			return;
		}

		// $scheme is one of two literals, never data.
		printf(
			"<meta name=\"color-scheme\" content=\"%s\" />\n<meta name=\"theme-color\" content=\"%s\" />\n",
			esc_attr( $scheme ),
			esc_attr( $hex )
		);
	}
}
// Priority 5: core owns priority 0 on wp_head for the block-theme viewport tag.
add_action( 'wp_head', 'dirtbag_head_color_meta', 5 );
