<?php
/**
 * Apply a Dirtbag style variation as the active user global styles.
 *
 * Dev/test helper — switches the live site's active variation so an automated
 * sweep (e.g. the per-style axe pass in tests/) or a headless screenshot run can
 * render each variation. Mutates global state; callers must restore afterward by
 * applying the 'default' slug. Not shipped (playground/ is export-ignored).
 *
 * Usage (WP-CLI):
 *   wp eval-file playground/apply-style.php <slug>
 *   wp eval-file playground/apply-style.php default   # reset to theme default
 *
 * Usage (Playground blueprint `runPHP` step — see tests/ci-style-blueprint.mjs):
 *   <?php require '/wordpress/wp-load.php'; $args = ['terminal'];
 *   require get_theme_file_path('playground/apply-style.php');
 *
 * @package Dirtbag
 */

if ( ! defined( 'ABSPATH' ) ) {
	require '/wordpress/wp-load.php';
}

require_once __DIR__ . '/global-styles-post.php';

/**
 * The background a slug declares, or null when it deliberately declares none.
 *
 * @param string $slug Style slug, or 'default' for theme.json.
 * @return string|null Sanitised hex colour, or null.
 */
function dirtbag_apply_style_declared_background( $slug ) {
	$file = ( '' === $slug || 'default' === $slug )
		? get_theme_file_path( 'theme.json' )
		: get_theme_file_path( "styles/{$slug}.json" );

	if ( ! is_readable( $file ) ) {
		return null;
	}

	$json = json_decode( (string) file_get_contents( $file ), true ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- local theme file, no HTTP.
	if ( ! is_array( $json ) || ! isset( $json['styles']['color']['background'] ) ) {
		return null;
	}

	return sanitize_hex_color( $json['styles']['color']['background'] );
}

$slug = isset( $args[0] ) ? trim( (string) $args[0] ) : 'default';
if ( '' === $slug ) {
	$slug = 'default';
}

if ( ! preg_match( '/^[a-z0-9-]+$/', $slug ) ) {
	dirtbag_global_styles_fail( 'apply-style', "invalid style slug '{$slug}'" );
}

$stylesheet = wp_get_theme()->get_stylesheet();

$post_id = WP_Theme_JSON_Resolver::get_user_global_styles_post_id();
if ( ! $post_id ) {
	dirtbag_global_styles_fail( 'apply-style', 'no user global styles post for the active theme' );
}

dirtbag_link_global_styles_post_to_theme( $post_id, 'apply-style' );

if ( 'default' === $slug ) {
	// Theme default = an empty user layer (theme.json + any default variation win).
	$payload = array(
		'version'                     => 3,
		'isGlobalStylesUserThemeJSON' => true,
		'settings'                    => array(),
		'styles'                      => array(),
	);
} else {
	$file = get_theme_file_path( "styles/{$slug}.json" );
	if ( ! is_readable( $file ) ) {
		dirtbag_global_styles_fail( 'apply-style', "styles/{$slug}.json not found or unreadable" );
	}

	$variation = json_decode( (string) file_get_contents( $file ), true ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- local theme file, no HTTP.
	if ( ! is_array( $variation ) ) {
		dirtbag_global_styles_fail( 'apply-style', "styles/{$slug}.json is not valid JSON" );
	}

	$payload = array(
		'version'                     => isset( $variation['version'] ) ? (int) $variation['version'] : 3,
		'isGlobalStylesUserThemeJSON' => true,
		'settings'                    => isset( $variation['settings'] ) ? $variation['settings'] : array(),
		'styles'                      => isset( $variation['styles'] ) ? $variation['styles'] : array(),
	);
}

/*
 * Write past core's kses pass on global styles.
 *
 * Core hooks wp_filter_global_styles_post() onto `content_save_pre` for anyone
 * who cannot `unfiltered_html` (kses_init() → kses_init_filters()). Its
 * remove_insecure_properties() settings pass keeps only presets and typed
 * VALID_SETTINGS, so the free-form `settings.custom` tree is dropped before it
 * reaches the database. `styles` survives, which is why the background applied
 * but the variation's `settings.custom.dirtbag.truckIconFilter` did not, and why
 * truck-icon.spec.js saw the theme.json fallback on every style.
 *
 * A Playground boot step runs with no user and hits this. Under `wp eval-file`
 * the filter is generally not hooked at all, which is why the local Studio sweep
 * never showed it — the two environments disagree, so neither alone is evidence
 * the variation landed.
 *
 * Dropping the filter for this one write is safe here in a way it would not be
 * for real user input: the payload is the theme's own styles/<slug>.json, read
 * off disk a few lines above, and this file is a dev/test helper that never
 * ships (playground/ is export-ignored). Restored immediately afterwards so
 * nothing else in the process is affected.
 */
$had_kses_filter = has_filter( 'content_save_pre', 'wp_filter_global_styles_post' );
if ( false !== $had_kses_filter ) {
	remove_filter( 'content_save_pre', 'wp_filter_global_styles_post', $had_kses_filter );
}

$result = wp_update_post(
	array(
		'ID'           => $post_id,
		'post_content' => wp_json_encode( $payload ),
	),
	true
);

if ( false !== $had_kses_filter ) {
	add_filter( 'content_save_pre', 'wp_filter_global_styles_post', $had_kses_filter );
}

if ( is_wp_error( $result ) ) {
	dirtbag_global_styles_fail( 'apply-style', $result->get_error_message() );
}

// Drop the resolver's static cache and object cache so the next request rebuilds.
WP_Theme_JSON_Resolver::clean_cached_data();
wp_cache_flush();

// The write must be one WordPress can find again. This is the check that would
// have caught the termless-orphan bug: the update above reported success while
// every reader looked somewhere else.
dirtbag_assert_global_styles_post_is_live( $post_id, 'apply-style' );

// And the merged styles must actually carry the variation's colour. Only
// meaningful for a slug that declares one; Dirtbag's default deliberately does
// not, and asserting the absence of a colour would also pass on a failed apply.
$expected = dirtbag_apply_style_declared_background( $slug );
if ( null !== $expected ) {
	$actual = wp_get_global_styles(
		array( 'color', 'background' ),
		array( 'transforms' => array( 'resolve-variables' ) )
	);
	$actual = is_string( $actual ) ? sanitize_hex_color( $actual ) : null;

	if ( strtolower( (string) $expected ) !== strtolower( (string) $actual ) ) {
		dirtbag_global_styles_fail(
			'apply-style',
			"applied '{$slug}' but the merged background is '" . ( null === $actual ? 'none' : $actual ) . "', expected '{$expected}'"
		);
	}
}

// The settings layer travels by a different route than styles and is the piece
// core strips by default, so check it separately rather than assuming that a
// correct background means the whole variation landed.
$expected_filter = isset( $payload['settings']['custom']['dirtbag']['truckIconFilter'] )
	? $payload['settings']['custom']['dirtbag']['truckIconFilter']
	: null;

if ( null !== $expected_filter ) {
	$actual_filter = wp_get_global_settings( array( 'custom', 'dirtbag', 'truckIconFilter' ) );
	if ( ! is_string( $actual_filter ) || $expected_filter !== $actual_filter ) {
		dirtbag_global_styles_fail(
			'apply-style',
			"applied '{$slug}' but settings.custom.dirtbag.truckIconFilter resolves to '"
			. ( is_string( $actual_filter ) ? $actual_filter : gettype( $actual_filter ) )
			. "' — the variation's settings tree did not survive the write"
		);
	}
}

echo "apply-style: applied '{$slug}' to global styles post {$post_id}\n";
