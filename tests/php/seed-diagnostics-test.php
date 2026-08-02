<?php
/**
 * Unit tests for the Playground seed's failure reporting.
 *
 * The seed used to skip work silently: four `continue`s in the media importer
 * and an `isset()` guard on the thumbnail wrote nothing anywhere, so a partial
 * seed reached CI as a bare 120-second "Playground failed to boot" with no
 * indication that an attachment had been dropped. These cover the paths that
 * now report, plus the retry whose loop ended on a write.
 *
 * Dependency-free by design (no PHPUnit, no Composer) to match the theme's
 * no-build ethos. Run directly, or via `bin/package-check`:
 *
 *     php tests/php/seed-diagnostics-test.php
 *
 * @package Dirtbag
 */

define( 'ABSPATH', __DIR__ );
define( 'OBJECT', 'OBJECT' ); // WordPress defines this in wp-includes/constants.php.

// Defined before seed-content.php loads: stderr.php guards on function_exists,
// so this capturing stub wins and the messages become assertable.
$GLOBALS['dirtbag_test_stderr'] = array();
function dirtbag_playground_stderr( $message ) { // phpcs:ignore
	$GLOBALS['dirtbag_test_stderr'][] = (string) $message;
}

// -- WordPress stubs, narrowed to what the paths under test touch -----------

$GLOBALS['dirtbag_test_stylesheet'] = 'twentytwentyfive';
$GLOBALS['dirtbag_test_users']      = array();
$GLOBALS['dirtbag_test_writes']     = 0;

if ( ! function_exists( 'get_stylesheet' ) ) {
	function get_stylesheet() { // phpcs:ignore
		return $GLOBALS['dirtbag_test_stylesheet'];
	}
}
if ( ! function_exists( 'get_theme_file_path' ) ) {
	function get_theme_file_path( $file = '' ) { // phpcs:ignore
		// Mirrors the real resolution against the *active* theme, which is the
		// behaviour that drops media when activation has not landed.
		return '/wordpress/wp-content/themes/' . get_stylesheet() . '/' . $file;
	}
}
if ( ! function_exists( 'get_page_by_path' ) ) {
	function get_page_by_path() { // phpcs:ignore
		return null;
	}
}
if ( ! function_exists( 'clean_user_cache' ) ) {
	function clean_user_cache() {} // phpcs:ignore
}
if ( ! function_exists( 'get_userdata' ) ) {
	function get_userdata( $user_id ) { // phpcs:ignore
		return isset( $GLOBALS['dirtbag_test_users'][ $user_id ] )
			? (object) $GLOBALS['dirtbag_test_users'][ $user_id ]
			: false;
	}
}
if ( ! function_exists( 'wp_update_user' ) ) {
	function wp_update_user( $args ) { // phpcs:ignore
		++$GLOBALS['dirtbag_test_writes'];
		// Persist only once the configured number of writes has happened, to
		// model the transient WASM sanitisation failure the retry exists for.
		if ( $GLOBALS['dirtbag_test_writes'] >= $GLOBALS['dirtbag_test_persist_after'] ) {
			$GLOBALS['dirtbag_test_users'][ $args['ID'] ]['display_name']  = $args['display_name'];
			$GLOBALS['dirtbag_test_users'][ $args['ID'] ]['user_nicename'] = $args['user_nicename'];
		}
		return $args['ID'];
	}
}

require_once __DIR__ . '/../../playground/seed-content.php';

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
 * Assert a captured message contains a substring.
 *
 * @param string $needle Substring required.
 * @param string $actual Message to search.
 * @param string $label  Human-readable case description.
 */
function dirtbag_assert_contains( $needle, $actual, $label ) {
	global $failures, $count;
	++$count;
	if ( is_string( $actual ) && false !== strpos( $actual, $needle ) ) {
		return;
	}
	++$failures;
	printf( "FAIL: %s\n  %s\n  not found in: %s\n", $label, $needle, var_export( $actual, true ) ); // phpcs:ignore
}

/**
 * Reset captured output between cases.
 */
function dirtbag_test_reset() {
	$GLOBALS['dirtbag_test_stderr'] = array();
}

// -- Media: a source file that is not there must say so, and name the theme --

dirtbag_test_reset();
$ids = dirtbag_playground_seed_media(
	array(
		'109' => array(
			'filename'  => 'truck.jpg',
			'post_name' => 'truck',
			'title'     => 'Truck',
			'caption'   => '',
			'descripti' => '',
		),
	)
);

dirtbag_assert_same( array(), $ids, 'media: a missing source yields no attachment id' );
dirtbag_assert_same( 1, count( $GLOBALS['dirtbag_test_stderr'] ), 'media: the skip is reported exactly once' );
dirtbag_assert_contains( 'truck.jpg', $GLOBALS['dirtbag_test_stderr'][0], 'media: the report names the file' );
dirtbag_assert_contains(
	'twentytwentyfive',
	$GLOBALS['dirtbag_test_stderr'][0],
	'media: the report names the theme it resolved against — the difference between missing media and wrong theme'
);

// -- User identity: the retry must not report a success as a failure --------

// Persists on the third write. The old loop verified, wrote, and ended on that
// write without re-reading, so this case was reported as a failure.
$GLOBALS['dirtbag_test_users']         = array( 7 => array( 'display_name' => '', 'user_nicename' => '' ) );
$GLOBALS['dirtbag_test_writes']        = 0;
$GLOBALS['dirtbag_test_persist_after'] = 3;
dirtbag_test_reset();

dirtbag_playground_assert_user_identity( 7, array( 'display_name' => 'Roadside Archivist', 'user_nicename' => 'roadside-archivist' ) );
dirtbag_assert_same( array(), $GLOBALS['dirtbag_test_stderr'], 'users: persisting on the final write is not reported as a failure' );
dirtbag_assert_same( 'roadside-archivist', $GLOBALS['dirtbag_test_users'][7]['user_nicename'], 'users: the nicename actually landed' );

// -- User identity: a genuine failure must still be reported, once -----------

$GLOBALS['dirtbag_test_users']         = array( 8 => array( 'display_name' => '', 'user_nicename' => '' ) );
$GLOBALS['dirtbag_test_writes']        = 0;
$GLOBALS['dirtbag_test_persist_after'] = 99; // Never persists.
dirtbag_test_reset();

dirtbag_playground_assert_user_identity( 8, array( 'display_name' => 'Roadside Archivist', 'user_nicename' => 'roadside-archivist' ) );
dirtbag_assert_same( 1, count( $GLOBALS['dirtbag_test_stderr'] ), 'users: a real failure is reported exactly once' );
dirtbag_assert_contains( 'did not persist', $GLOBALS['dirtbag_test_stderr'][0], 'users: the report says what happened' );
dirtbag_assert_contains( 'roadside-archivist', $GLOBALS['dirtbag_test_stderr'][0], 'users: the report says what was wanted' );

// -- Result -----------------------------------------------------------------

if ( $failures > 0 ) {
	printf( "\n%d of %d assertions failed.\n", $failures, $count );
	exit( 1 );
}
printf( "seed diagnostics unit tests OK (%d assertions)\n", $count );
