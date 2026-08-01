<?php
/**
 * Unit tests for Dirtbag's colour-scheme derivation.
 *
 * These cover the one island of real logic in the theme: turning a background
 * colour into a `color-scheme` keyword. Everything else in functions.php is a
 * render filter that needs a booted WordPress; these two functions are pure, so
 * they get real unit tests per docs/testing-strategy.md → Level 6.
 *
 * Dependency-free by design (no PHPUnit, no Composer) to match the theme's
 * no-build ethos. Run directly, or via `bin/package-check`:
 *
 *     php tests/php/color-scheme-test.php
 *
 * @package Dirtbag
 */

// functions.php guards on ABSPATH and registers filters at load; stub just
// enough WordPress to require it outside a running install.
define( 'ABSPATH', __DIR__ );

if ( ! function_exists( 'add_filter' ) ) {
	function add_filter() {} // phpcs:ignore
}
if ( ! function_exists( 'add_action' ) ) {
	function add_action() {} // phpcs:ignore
}
if ( ! function_exists( '__' ) ) {
	function __( $text ) { // phpcs:ignore
		return $text;
	}
}

// Controls what the stubbed wp_get_global_styles() hands back, so the emitter
// can be exercised across the shapes a real install produces.
$GLOBALS['dirtbag_test_background'] = null;

if ( ! function_exists( 'wp_get_global_styles' ) ) {
	function wp_get_global_styles() { // phpcs:ignore
		return $GLOBALS['dirtbag_test_background'];
	}
}
if ( ! function_exists( 'sanitize_hex_color' ) ) {
	// Mirrors core's implementation (wp-includes/formatting.php), including its
	// asymmetric return: '' for the empty string, null for anything invalid.
	function sanitize_hex_color( $color ) { // phpcs:ignore
		if ( '' === $color ) {
			return '';
		}
		return preg_match( '|^#([A-Fa-f0-9]{3}){1,2}$|', $color ) ? $color : null;
	}
}
if ( ! function_exists( 'esc_attr' ) ) {
	function esc_attr( $text ) { // phpcs:ignore
		return htmlspecialchars( $text, ENT_QUOTES );
	}
}

require_once dirname( __DIR__, 2 ) . '/functions.php';

$failures = 0;
$count    = 0;

/**
 * Assert two values are identical, reporting the case on failure.
 *
 * @param mixed  $expected Expected value.
 * @param mixed  $actual   Actual value.
 * @param string $label    Human-readable case description.
 */
function dirtbag_assert_same( $expected, $actual, $label ) {
	global $failures, $count;
	++$count;
	if ( $expected === $actual ) {
		return;
	}
	++$failures;
	printf(
		"FAIL: %s\n  expected: %s\n  actual:   %s\n",
		$label,
		var_export( $expected, true ), // phpcs:ignore
		var_export( $actual, true ) // phpcs:ignore
	);
}

/**
 * Assert a float matches within a small tolerance.
 *
 * @param float  $expected Expected value.
 * @param mixed  $actual   Actual value.
 * @param string $label    Human-readable case description.
 */
function dirtbag_assert_close( $expected, $actual, $label ) {
	global $failures, $count;
	++$count;
	if ( is_float( $actual ) && abs( $expected - $actual ) < 0.0005 ) {
		return;
	}
	++$failures;
	printf(
		"FAIL: %s\n  expected: ~%F\n  actual:   %s\n",
		$label,
		$expected,
		var_export( $actual, true ) // phpcs:ignore
	);
}

// -- Relative luminance (WCAG 2.x) ---------------------------------------

dirtbag_assert_close( 0.0, dirtbag_relative_luminance( '#000000' ), 'luminance: black is 0' );
dirtbag_assert_close( 1.0, dirtbag_relative_luminance( '#ffffff' ), 'luminance: white is 1' );
// 0.2126 (R) + 0.7152 (G), both fully on.
dirtbag_assert_close( 0.9278, dirtbag_relative_luminance( '#ffff00' ), 'luminance: yellow is R+G coefficients' );
// Blue-only, gamma-expanded: 0.0722 * ((0.6+0.055)/1.055)^2.4.
dirtbag_assert_close( 0.0230, dirtbag_relative_luminance( '#000099' ), 'luminance: blueprint navy' );
// Below the 0.03928 threshold, the linear (non-power) branch applies.
dirtbag_assert_close( 0.0056, dirtbag_relative_luminance( '#111111' ), 'luminance: near-black uses linear branch' );

dirtbag_assert_same( null, dirtbag_relative_luminance( 'rgb(0,0,0)' ), 'luminance: rgb() is not a hex colour' );
dirtbag_assert_same( null, dirtbag_relative_luminance( 'var(--wp--preset--color--base)' ), 'luminance: unresolved var is rejected' );

// -- Colour scheme -------------------------------------------------------

// The threshold is the equal-contrast point against black and white:
// sqrt(1.05 * 0.05) - 0.05 ~= 0.1791. Not an arbitrary 0.5.
dirtbag_assert_same( 'dark', dirtbag_color_scheme_for( '#000000' ), 'scheme: black is dark' );
dirtbag_assert_same( 'light', dirtbag_color_scheme_for( '#ffffff' ), 'scheme: white is light' );
dirtbag_assert_same( 'light', dirtbag_color_scheme_for( '#ffff00' ), 'scheme: hi-vis yellow is light' );
dirtbag_assert_same( 'dark', dirtbag_color_scheme_for( '#000099' ), 'scheme: blueprint navy is dark' );
dirtbag_assert_same( 'light', dirtbag_color_scheme_for( '#F90' ), 'scheme: 3-digit hex expands' );
dirtbag_assert_same( 'light', dirtbag_color_scheme_for( '#FFFFFF' ), 'scheme: uppercase hex' );

// Fail closed: anything that is not a literal hex colour yields no claim, so
// the caller emits no tag rather than guessing.
dirtbag_assert_same( null, dirtbag_color_scheme_for( 'rgb(0,0,0)' ), 'scheme: rgb() yields no claim' );
dirtbag_assert_same( null, dirtbag_color_scheme_for( 'rgba(0,0,0,0.5)' ), 'scheme: rgba() yields no claim' );
dirtbag_assert_same( null, dirtbag_color_scheme_for( 'var(--x)' ), 'scheme: unresolved var yields no claim' );
dirtbag_assert_same( null, dirtbag_color_scheme_for( 'black' ), 'scheme: named colour yields no claim' );
dirtbag_assert_same( null, dirtbag_color_scheme_for( '' ), 'scheme: empty string yields no claim' );
dirtbag_assert_same( null, dirtbag_color_scheme_for( '#12345' ), 'scheme: malformed hex yields no claim' );
dirtbag_assert_same( null, dirtbag_color_scheme_for( null ), 'scheme: null yields no claim' );
// wp_get_global_styles() returns the ENTIRE styles array when the path is
// missing — the exact shape seen on the default style, which declares no
// background. Must not fatal.
dirtbag_assert_same( null, dirtbag_color_scheme_for( array( 'color' => 'x' ) ), 'scheme: array yields no claim' );

// -- Shipped style variations -------------------------------------------

// Every variation that declares a background must classify. This ties the test
// to the source of truth instead of a parallel hardcoded table.
$expected_schemes = array(
	'amber-crt'  => 'dark',
	'blueprint'  => 'dark',
	'hi-vis'     => 'light',
	'minimalist' => 'light',
	'newspaper'  => 'light',
	'terminal'   => 'dark',
);

foreach ( $expected_schemes as $slug => $expected ) {
	$file = dirname( __DIR__, 2 ) . "/styles/{$slug}.json";
	$json = json_decode( file_get_contents( $file ), true ); // phpcs:ignore
	$bg   = isset( $json['styles']['color']['background'] ) ? $json['styles']['color']['background'] : null;
	dirtbag_assert_same( $expected, dirtbag_color_scheme_for( $bg ), "variation: {$slug} ({$bg})" );
}

// The default (Brutalist) style deliberately declares no background — it rides
// the UA default. No colour, no claim, no tags.
$theme_json = json_decode( file_get_contents( dirname( __DIR__, 2 ) . '/theme.json' ), true ); // phpcs:ignore
dirtbag_assert_same(
	false,
	isset( $theme_json['styles']['color']['background'] ),
	'default style declares no background'
);

// -- The emitter ---------------------------------------------------------

/**
 * Capture what dirtbag_head_color_meta() prints for a given global-styles value.
 *
 * @param mixed $background Value the stubbed wp_get_global_styles() returns.
 * @return string Emitted markup.
 */
function dirtbag_capture_head_meta( $background ) {
	$GLOBALS['dirtbag_test_background'] = $background;
	ob_start();
	dirtbag_head_color_meta();
	return ob_get_clean();
}

dirtbag_assert_same(
	"<meta name=\"color-scheme\" content=\"dark\" />\n<meta name=\"theme-color\" content=\"#000000\" />\n",
	dirtbag_capture_head_meta( '#000000' ),
	'emitter: terminal / amber-crt black background'
);
dirtbag_assert_same(
	"<meta name=\"color-scheme\" content=\"dark\" />\n<meta name=\"theme-color\" content=\"#000099\" />\n",
	dirtbag_capture_head_meta( '#000099' ),
	'emitter: blueprint navy background'
);
dirtbag_assert_same(
	"<meta name=\"color-scheme\" content=\"light\" />\n<meta name=\"theme-color\" content=\"#ffff00\" />\n",
	dirtbag_capture_head_meta( '#ffff00' ),
	'emitter: hi-vis yellow background'
);

// The critical guard. wp_get_global_styles() returns the ENTIRE styles array
// when the requested path is missing, which is what Dirtbag's default style
// produces — it declares no background at all. Without the is_string() check
// this path reaches esc_attr() with an array and fatals every front-end page.
dirtbag_assert_same(
	'',
	dirtbag_capture_head_meta(
		array(
			'blocks'     => array(),
			'elements'   => array(),
			'spacing'    => array(),
			'typography' => array(),
		)
	),
	'emitter: missing path returns whole styles array — emits nothing, does not fatal'
);

dirtbag_assert_same( '', dirtbag_capture_head_meta( null ), 'emitter: null emits nothing' );
dirtbag_assert_same( '', dirtbag_capture_head_meta( '' ), 'emitter: empty string emits nothing' );
dirtbag_assert_same( '', dirtbag_capture_head_meta( 'rgb(0,0,0)' ), 'emitter: rgb() emits nothing' );
dirtbag_assert_same(
	'',
	dirtbag_capture_head_meta( 'var(--wp--preset--color--base)' ),
	'emitter: unresolved var emits nothing'
);

// -- Result --------------------------------------------------------------

if ( $failures > 0 ) {
	printf( "\n%d of %d assertions failed.\n", $failures, $count );
	exit( 1 );
}
printf( "colour-scheme unit tests OK (%d assertions)\n", $count );
