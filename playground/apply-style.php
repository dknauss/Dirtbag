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

require_once __DIR__ . '/global-styles-post.php';

$slug = isset( $args[0] ) ? trim( (string) $args[0] ) : 'default';

$post_id = WP_Theme_JSON_Resolver::get_user_global_styles_post_id();
if ( ! $post_id ) {
	dirtbag_playground_stderr( "apply-style: no user global styles post for the active theme\n" );
	exit( 1 );
}

dirtbag_link_global_styles_post_to_theme( $post_id, 'apply-style' );

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
		dirtbag_playground_stderr( "apply-style: styles/{$slug}.json not found or unreadable\n" );
		exit( 1 );
	}

	$variation = json_decode( (string) file_get_contents( $file ), true );
	if ( ! is_array( $variation ) ) {
		dirtbag_playground_stderr( "apply-style: styles/{$slug}.json is not valid JSON\n" );
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
	dirtbag_playground_stderr( 'apply-style: ' . $result->get_error_message() . "\n" );
	exit( 1 );
}

// Drop the resolver's static cache and object cache so the next request rebuilds.
WP_Theme_JSON_Resolver::clean_cached_data();
wp_cache_flush();

dirtbag_assert_global_styles_post_is_live( $post_id, 'apply-style' );

echo "apply-style: applied '{$slug}' to global styles post {$post_id}\n";
