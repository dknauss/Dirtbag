<?php
/**
 * Add (or clear) user "Additional CSS" on the live site's global styles.
 *
 * Dev/test helper — reproduces what Site Editor → Styles → Additional CSS does:
 * it writes a `styles.css` string into the *user* global styles post. That is the
 * exact input that used to wipe `theme.json`'s own root `styles.css`, because core
 * merges global styles with `array_replace_recursive()` and a string key replaces
 * rather than merges. See `dirtbag_preserve_root_custom_css()` in functions.php.
 *
 * Companion to apply-style.php: that one activates a variation, this one layers
 * Additional CSS on top of it. Mutates global state; callers must restore
 * afterward with the `clear` mode (or by applying the 'default' slug).
 *
 * Usage (WP-CLI):
 *   wp eval-file playground/apply-additional-css.php default        # empty layer + Additional CSS
 *   wp eval-file playground/apply-additional-css.php terminal       # variation + Additional CSS
 *   wp eval-file playground/apply-additional-css.php terminal clear # variation, `css` key absent
 *   wp eval-file playground/apply-additional-css.php terminal empty # variation, `css` key present but ''
 *
 * `clear` and `empty` are deliberately different states. Core merges on the key,
 * so a `css` of '' replaces theme.json's root CSS exactly as a real rule does —
 * which is what clearing the Site Editor's Additional CSS panel can leave behind.
 *
 * The CSS is a fixed sentinel rather than a caller-supplied string: `studio wp`
 * mangles arguments containing spaces and `--`, which silently produced empty
 * writes. Keep DIRTBAG_USER_CSS_SENTINEL in step with tests/styles/additional-css.spec.js.
 *
 * @package Dirtbag
 */

if ( ! defined( 'ABSPATH' ) ) {
	require '/wordpress/wp-load.php';
}

require_once __DIR__ . '/global-styles-post.php';

/**
 * The marker declaration written as user Additional CSS. Harmless on its own —
 * it only exists so a test can prove the user's own CSS still reaches the page.
 */
const DIRTBAG_USER_CSS_SENTINEL = 'body { --dirtbag-user-css: 1; }';

$slug = isset( $args[0] ) ? trim( (string) $args[0] ) : 'default';
$mode = isset( $args[1] ) ? trim( (string) $args[1] ) : 'set';
if ( ! in_array( $mode, array( 'set', 'clear', 'empty' ), true ) ) {
	fwrite( STDERR, "apply-additional-css: mode must be one of set|clear|empty, got '{$mode}'\n" );
	exit( 1 );
}

/*
 * Become an administrator before writing.
 *
 * `styles.css` is the one part of user global styles that core sanitises on
 * save: wp_filter_global_styles_post() runs remove_insecure_properties(), which
 * keeps `css` only for a user with `edit_css`. WP-CLI runs with no current user
 * at all, so on any runtime where those kses filters are attached the CSS this
 * helper writes would be stripped back out again.
 *
 * `studio wp` happens not to attach them (WP-CLI drops kses filters for CLI
 * writes — measured: user 0, `init` fired, filter absent), which is why this
 * works there without a `--user`. That is a property of one runtime, not a
 * guarantee, and relying on it would leave the documented
 * `npm run test:styles:additional-css` broken anywhere it does not hold. Setting
 * the user makes the behaviour the same either way, and matches how a real Site
 * Editor save reaches `styles.css` in the first place.
 */
$admins = get_users( array( 'role' => 'administrator', 'number' => 1, 'fields' => 'ID' ) );
if ( empty( $admins ) ) {
	fwrite( STDERR, "apply-additional-css: no administrator to write global styles as\n" );
	exit( 1 );
}
wp_set_current_user( (int) $admins[0] );
if ( ! current_user_can( 'edit_css' ) ) {
	fwrite( STDERR, "apply-additional-css: user {$admins[0]} cannot edit_css; styles.css would be stripped on save\n" );
	exit( 1 );
}

$post_id = WP_Theme_JSON_Resolver::get_user_global_styles_post_id();
if ( ! $post_id ) {
	fwrite( STDERR, "apply-additional-css: no user global styles post for the active theme\n" );
	exit( 1 );
}

dirtbag_link_global_styles_post_to_theme( $post_id, 'apply-additional-css' );

$settings = array();
$styles   = array();

if ( '' !== $slug && 'default' !== $slug ) {
	$file = get_theme_file_path( "styles/{$slug}.json" );
	if ( ! is_readable( $file ) ) {
		fwrite( STDERR, "apply-additional-css: styles/{$slug}.json not found or unreadable\n" );
		exit( 1 );
	}

	$variation = json_decode( (string) file_get_contents( $file ), true );
	if ( ! is_array( $variation ) ) {
		fwrite( STDERR, "apply-additional-css: styles/{$slug}.json is not valid JSON\n" );
		exit( 1 );
	}

	$settings = isset( $variation['settings'] ) ? $variation['settings'] : array();
	$styles   = isset( $variation['styles'] ) ? $variation['styles'] : array();
}

if ( 'set' === $mode ) {
	$styles['css'] = DIRTBAG_USER_CSS_SENTINEL;
} elseif ( 'empty' === $mode ) {
	$styles['css'] = '';
}

$payload = array(
	'version'                     => 3,
	'isGlobalStylesUserThemeJSON' => true,
	'settings'                    => $settings,
	'styles'                      => $styles,
);

$result = wp_update_post(
	array(
		'ID'           => $post_id,
		'post_content' => wp_json_encode( $payload ),
	),
	true
);

if ( is_wp_error( $result ) ) {
	fwrite( STDERR, 'apply-additional-css: ' . $result->get_error_message() . "\n" );
	exit( 1 );
}

// A caller without `edit_css` (WP-CLI runs as user 0) has its `styles.css`
// stripped on save by wp_filter_global_styles_post(). Fail loudly rather than
// letting a test pass against a site that never got the Additional CSS. Checked
// as key *presence*, since the `empty` mode legitimately stores ''.
clean_post_cache( $post_id );
$stored     = json_decode( (string) get_post( $post_id )->post_content, true );
$key_stored = is_array( $stored ) && isset( $stored['styles'] ) && array_key_exists( 'css', (array) $stored['styles'] );
if ( 'clear' !== $mode && ! $key_stored ) {
	fwrite( STDERR, "apply-additional-css: styles.css was stripped on save (needs a user with 'edit_css')\n" );
	exit( 1 );
}
if ( 'clear' === $mode && $key_stored ) {
	fwrite( STDERR, "apply-additional-css: styles.css survived a clear\n" );
	exit( 1 );
}

// Drop the resolver's static cache and object cache so the next request rebuilds.
WP_Theme_JSON_Resolver::clean_cached_data();
wp_cache_flush();

dirtbag_assert_global_styles_post_is_live( $post_id, 'apply-additional-css' );

echo "apply-additional-css: {$mode} on '{$slug}' (global styles post {$post_id})\n";
