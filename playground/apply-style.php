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
 * @package Dirtbag
 */

if ( ! defined( 'ABSPATH' ) ) {
	require '/wordpress/wp-load.php';
}

$slug = isset( $args[0] ) ? trim( (string) $args[0] ) : 'default';

$post_id = WP_Theme_JSON_Resolver::get_user_global_styles_post_id();
if ( ! $post_id ) {
	fwrite( STDERR, "apply-style: no user global styles post for the active theme\n" );
	exit( 1 );
}

/*
 * Link the post to the active theme ourselves.
 *
 * A `wp_global_styles` post is bound to a theme by a `wp_theme` term, and that
 * term is the only thing the front end's lookup matches on. Core creates the
 * post with `tax_input => array( 'wp_theme' => <stylesheet> )`, but
 * wp_insert_post() applies `tax_input` only when the current user can assign
 * terms — and WP-CLI (`wp`, `studio wp`) runs with no current user at all.
 *
 * So on a site that has no global-styles post for the active theme yet, the
 * post core just created for us arrives untagged: this script writes to it,
 * reports success, and the front end — whose own query filters on that term —
 * never finds it. The next invocation repeats the whole thing, leaving a trail
 * of orphaned posts and a sweep that silently scans unchanged styles.
 *
 * wp_set_object_terms() has no capability check, so do the linking here.
 */
$stylesheet = wp_get_theme()->get_stylesheet();
$terms      = wp_get_object_terms( $post_id, 'wp_theme', array( 'fields' => 'names' ) );
if ( is_wp_error( $terms ) || ! in_array( $stylesheet, $terms, true ) ) {
	$tagged = wp_set_object_terms( $post_id, $stylesheet, 'wp_theme' );
	if ( is_wp_error( $tagged ) ) {
		fwrite( STDERR, "apply-style: could not link post {$post_id} to theme '{$stylesheet}': " . $tagged->get_error_message() . "\n" );
		exit( 1 );
	}
}

if ( '' === $slug || 'default' === $slug ) {
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
		fwrite( STDERR, "apply-style: styles/{$slug}.json not found or unreadable\n" );
		exit( 1 );
	}

	$variation = json_decode( (string) file_get_contents( $file ), true );
	if ( ! is_array( $variation ) ) {
		fwrite( STDERR, "apply-style: styles/{$slug}.json is not valid JSON\n" );
		exit( 1 );
	}

	$payload = array(
		'version'                     => isset( $variation['version'] ) ? (int) $variation['version'] : 3,
		'isGlobalStylesUserThemeJSON' => true,
		'settings'                    => isset( $variation['settings'] ) ? $variation['settings'] : array(),
		'styles'                      => isset( $variation['styles'] ) ? $variation['styles'] : array(),
	);
}

$result = wp_update_post(
	array(
		'ID'           => $post_id,
		'post_content' => wp_json_encode( $payload ),
	),
	true
);

if ( is_wp_error( $result ) ) {
	fwrite( STDERR, 'apply-style: ' . $result->get_error_message() . "\n" );
	exit( 1 );
}

// Drop the resolver's static cache and object cache so the next request rebuilds.
WP_Theme_JSON_Resolver::clean_cached_data();
wp_cache_flush();

/*
 * Confirm the post we just wrote is the one the front end will read.
 *
 * Same fail-loud contract the rest of this harness runs on: a helper that
 * reports success while the page under test never changes turns every
 * downstream assertion into a test of the default variation. This runs the
 * front end's own lookup — get_user_data() with `$create_post` off, after the
 * caches above are dropped — and compares the post it returns. Passing `false`
 * matters: get_user_global_styles_post_id() would create yet another post here
 * rather than report the miss.
 */
$live    = WP_Theme_JSON_Resolver::get_user_data_from_wp_global_styles( wp_get_theme(), false );
$live_id = isset( $live['ID'] ) ? (int) $live['ID'] : 0;
if ( $live_id !== (int) $post_id ) {
	$reads = $live_id ? "post {$live_id}" : 'no post';
	fwrite( STDERR, "apply-style: wrote post {$post_id}, but the front end reads {$reads} for theme '{$stylesheet}'\n" );
	fwrite( STDERR, "apply-style: the applied variation would not render — refusing to report success\n" );
	exit( 1 );
}

echo "apply-style: applied '{$slug}' to global styles post {$post_id}\n";
