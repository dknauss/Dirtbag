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

/**
 * Abort loudly.
 *
 * Both callers need the failure to be fatal, and neither sees a plain `exit(1)`:
 *
 * - Under a Playground `runPHP` step there is no console. STDOUT and STDERR are
 *   swallowed and a non-zero exit does not fail the boot, so an `exit(1)` here
 *   would let the sweep run happily against an unapplied style — which is
 *   exactly the bug this file used to have. An uncaught exception *does* fail
 *   the step ("PHP.run() failed with exit code 255") and therefore the boot.
 * - Under `wp eval-file` the uncaught exception is a fatal, so WP-CLI exits
 *   non-zero and tests/axe-styles.sh sees the failed `apply`.
 *
 * STDERR is a CLI-SAPI constant and is undefined under Playground, so guard the
 * write rather than fataling on the diagnostic itself.
 *
 * @param string $message Human-readable failure reason.
 * @throws RuntimeException Always.
 */
function dirtbag_apply_style_fail( $message ) {
	if ( defined( 'STDERR' ) ) {
		fwrite( STDERR, "apply-style: {$message}\n" );
	}
	throw new RuntimeException( "apply-style: {$message}" );
}

/**
 * Resolve — creating or repairing as needed — the user global-styles post that
 * WordPress will actually read for the active theme.
 *
 * Deliberately does not use WP_Theme_JSON_Resolver::get_user_global_styles_post_id().
 * That helper creates the post with
 * `wp_insert_post( array( ..., 'tax_input' => array( 'wp_theme' => array( $stylesheet ) ) ) )`,
 * and wp_insert_post() only honours `tax_input` when the current user can assign
 * the taxonomy's terms (`wp_theme` maps assign_terms to `edit_posts`). In a
 * Playground `runPHP` boot step nobody is logged in, so the post is created
 * *without* its `wp_theme` term — while the helper still returns the new ID, so
 * the caller looks successful.
 *
 * Every subsequent lookup, including the one the front end uses, filters on
 * exactly that term. It finds nothing, creates yet another termless orphan, and
 * falls back to theme.json. The write lands in a post WordPress will never read.
 *
 * wp_set_object_terms() has no capability gate, so attaching the term explicitly
 * works with no user at all — and repairs an orphan a previous run left behind.
 *
 * @param string $stylesheet Active theme stylesheet slug.
 * @return int Post ID, guaranteed linked to the theme's `wp_theme` term.
 */
function dirtbag_apply_style_global_styles_post_id( $stylesheet ) {
	// 1. A correctly linked post — what the front end will find.
	$linked = new WP_Query(
		array(
			'post_type'              => 'wp_global_styles',
			'post_status'            => 'publish',
			'posts_per_page'         => 1,
			'orderby'                => 'date',
			'order'                  => 'desc',
			'fields'                 => 'ids',
			'no_found_rows'          => true,
			'ignore_sticky_posts'    => true,
			'update_post_meta_cache' => false,
			'update_post_term_cache' => false,
			'tax_query'              => array( // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_tax_query -- how core itself resolves this post.
				array(
					'taxonomy' => 'wp_theme',
					'field'    => 'name',
					'terms'    => $stylesheet,
				),
			),
		)
	);

	if ( ! empty( $linked->posts ) ) {
		return (int) $linked->posts[0];
	}

	// 2. A termless orphan from an earlier userless run — adopt it rather than
	//    stacking up another. Core names it deterministically.
	$post_name = sprintf( 'wp-global-styles-%s', urlencode( $stylesheet ) );
	$orphan    = get_page_by_path( $post_name, OBJECT, 'wp_global_styles' );
	$post_id   = $orphan instanceof WP_Post ? (int) $orphan->ID : 0;

	// 3. Otherwise create it, mirroring core's shape.
	if ( ! $post_id ) {
		$created = wp_insert_post(
			array(
				'post_content' => '{"version":' . WP_Theme_JSON::LATEST_SCHEMA . ',"isGlobalStylesUserThemeJSON":true}',
				'post_status'  => 'publish',
				'post_title'   => 'Custom Styles',
				'post_type'    => 'wp_global_styles',
				'post_name'    => $post_name,
			),
			true
		);

		if ( is_wp_error( $created ) ) {
			dirtbag_apply_style_fail( 'could not create the global styles post: ' . $created->get_error_message() );
		}

		$post_id = (int) $created;
	}

	$terms = wp_set_object_terms( $post_id, $stylesheet, 'wp_theme' );
	if ( is_wp_error( $terms ) ) {
		dirtbag_apply_style_fail( "could not link post {$post_id} to the '{$stylesheet}' wp_theme term: " . $terms->get_error_message() );
	}

	return $post_id;
}

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
	dirtbag_apply_style_fail( "invalid style slug '{$slug}'" );
}

$stylesheet = get_stylesheet();
$post_id    = dirtbag_apply_style_global_styles_post_id( $stylesheet );

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
		dirtbag_apply_style_fail( "styles/{$slug}.json not found or unreadable" );
	}

	$variation = json_decode( (string) file_get_contents( $file ), true ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- local theme file, no HTTP.
	if ( ! is_array( $variation ) ) {
		dirtbag_apply_style_fail( "styles/{$slug}.json is not valid JSON" );
	}

	$payload = array(
		'version'                     => isset( $variation['version'] ) ? (int) $variation['version'] : 3,
		'isGlobalStylesUserThemeJSON' => true,
		'settings'                    => isset( $variation['settings'] ) ? $variation['settings'] : array(),
		'styles'                      => isset( $variation['styles'] ) ? $variation['styles'] : array(),
	);
}

/*
 * Store the variation whole, including its `settings`.
 *
 * Core hooks wp_filter_global_styles_post() onto `content_save_pre` for anyone
 * who cannot `unfiltered_html` (kses_init() → kses_init_filters()). That filter
 * runs the payload through WP_Theme_JSON::remove_insecure_properties(), whose
 * settings pass keeps only presets and typed VALID_SETTINGS entries — so the
 * free-form `settings.custom` tree is dropped before it reaches the database.
 * `styles` survives, which is why the background applies but the variation's
 * `settings.custom.dirtbag.truckIconFilter` did not, and why truck-icon.spec.js
 * saw the theme.json fallback on every style.
 *
 * A Playground boot step and a plain `wp eval-file` both run with no user, so
 * both hit this. Dropping the filter for this one write is safe here in a way it
 * would not be for real user input: the payload is the theme's own
 * styles/<slug>.json, read off disk a few lines above, and this file is a
 * dev/test helper that never ships (playground/ is export-ignored). Restored
 * immediately afterwards so nothing else in the process is affected.
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
	dirtbag_apply_style_fail( $result->get_error_message() );
}

// Drop the resolver's static cache and object cache so the next request rebuilds.
WP_Theme_JSON_Resolver::clean_cached_data();
wp_cache_flush();

// Verify the write is one WordPress can find again. This is the check that
// would have caught the termless-orphan bug: the update above reported success
// while every reader looked somewhere else.
$resolved = WP_Theme_JSON_Resolver::get_user_data_from_wp_global_styles( wp_get_theme() );
if ( ! isset( $resolved['ID'] ) || (int) $resolved['ID'] !== $post_id ) {
	$found = isset( $resolved['ID'] ) ? (int) $resolved['ID'] : 'none';
	dirtbag_apply_style_fail(
		"wrote global styles to post {$post_id} but WordPress resolves {$found} for '{$stylesheet}' — the wp_theme link is missing"
	);
}

// And that the merged styles now actually carry the variation's colour. Only
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
		dirtbag_apply_style_fail(
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
		dirtbag_apply_style_fail(
			"applied '{$slug}' but settings.custom.dirtbag.truckIconFilter resolves to '"
			. ( is_string( $actual_filter ) ? $actual_filter : gettype( $actual_filter ) )
			. "' — the variation's settings tree did not survive the write"
		);
	}
}

echo "apply-style: applied '{$slug}' to global styles post {$post_id}\n";
