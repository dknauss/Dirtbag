<?php
/**
 * Shared global-styles-post plumbing for the dev/test appliers.
 *
 * Both `apply-style.php` (activate a variation) and `apply-additional-css.php`
 * (layer user Additional CSS on top) write the site's `wp_global_styles` post
 * from WP-CLI, and both hit the same two traps. This holds the logic once so the
 * two cannot drift — the failure it guards against is silent, and a copy that
 * fell behind would be worse than no guard at all.
 *
 * Not shipped: playground/ is export-ignored.
 *
 * @package Dirtbag
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! function_exists( 'dirtbag_playground_stderr' ) ) {
	/**
	 * Report a diagnostic line, whichever SAPI this is running under.
	 *
	 * `STDERR` is defined only by the CLI SAPI. These scripts also run inside
	 * WordPress Playground, which serves over a web SAPI where the constant does
	 * not exist — so `fwrite( STDERR, ... )` is a fatal there.
	 *
	 * Every one of these calls sits on an error path, so the fatal replaced the
	 * very message that would have explained the failure: a boot that could not
	 * find its global-styles post died as `Undefined constant "STDERR"` instead of
	 * saying so, which is how it stayed unexplained through several CI rounds.
	 *
	 * The `php://stderr` wrapper works under both SAPIs. `error_log()` is the
	 * fallback and lands in the Playground server log that CI captures.
	 *
	 * @param string $message Message to report. A trailing newline is normalised.
	 * @return void
	 */
	function dirtbag_playground_stderr( $message ) {
		$message = rtrim( (string) $message, "\n" );
		// Suppressed: a failure here must fall through to error_log(), not warn
		// into the response body (WP_DEBUG_DISPLAY is on in the CI blueprint).
		$stream = @fopen( 'php://stderr', 'w' ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged
		if ( false !== $stream ) {
			fwrite( $stream, $message . "\n" );
			fclose( $stream );
			return;
		}
		error_log( $message ); // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
	}
}

if ( ! function_exists( 'dirtbag_link_global_styles_post_to_theme' ) ) {
	/**
	 * Bind a global-styles post to the active theme.
	 *
	 * A `wp_global_styles` post is bound to a theme by a `wp_theme` term, and that
	 * term is the only thing the front end's lookup matches on. Core creates the
	 * post with `tax_input => array( 'wp_theme' => <stylesheet> )`, but
	 * wp_insert_post() applies `tax_input` only when the current user can assign
	 * terms — and WP-CLI (`wp`, `studio wp`) runs with no current user at all.
	 *
	 * So on a site that has no global-styles post for the active theme yet, the
	 * post core just created for us arrives untagged: the caller writes to it,
	 * reports success, and the front end — whose own query filters on that term —
	 * never finds it. The next invocation repeats the whole thing, leaving a trail
	 * of orphaned posts and a sweep that silently scans unchanged styles.
	 *
	 * wp_set_object_terms() has no capability check, so do the linking here.
	 *
	 * @param int    $post_id Global styles post ID.
	 * @param string $label   Calling script name, for error output.
	 * @return void Exits with status 1 on failure.
	 */
	function dirtbag_link_global_styles_post_to_theme( $post_id, $label ) {
		$stylesheet = wp_get_theme()->get_stylesheet();
		$terms      = wp_get_object_terms( $post_id, 'wp_theme', array( 'fields' => 'names' ) );
		if ( is_wp_error( $terms ) || ! in_array( $stylesheet, $terms, true ) ) {
			$tagged = wp_set_object_terms( $post_id, $stylesheet, 'wp_theme' );
			if ( is_wp_error( $tagged ) ) {
				dirtbag_playground_stderr( "{$label}: could not link post {$post_id} to theme '{$stylesheet}': " . $tagged->get_error_message() . "\n" );
				exit( 1 );
			}
		}
	}
}

if ( ! function_exists( 'dirtbag_assert_global_styles_post_is_live' ) ) {
	/**
	 * Confirm the post just written is the one the front end will read.
	 *
	 * Same fail-loud contract the rest of this harness runs on: a helper that
	 * reports success while the page under test never changes turns every
	 * downstream assertion into a test of the default variation. This runs the
	 * front end's own lookup — get_user_data() with `$create_post` off, and the
	 * caller is expected to have dropped the resolver/object caches first — and
	 * compares the post it returns. Passing `false` matters:
	 * get_user_global_styles_post_id() would create yet another post here rather
	 * than report the miss.
	 *
	 * @param int    $post_id Global styles post ID the caller wrote.
	 * @param string $label   Calling script name, for error output.
	 * @return void Exits with status 1 when the front end reads a different post.
	 */
	function dirtbag_assert_global_styles_post_is_live( $post_id, $label ) {
		$stylesheet = wp_get_theme()->get_stylesheet();
		$live       = WP_Theme_JSON_Resolver::get_user_data_from_wp_global_styles( wp_get_theme(), false );
		$live_id    = isset( $live['ID'] ) ? (int) $live['ID'] : 0;
		if ( $live_id !== (int) $post_id ) {
			$reads = $live_id ? "post {$live_id}" : 'no post';
			dirtbag_playground_stderr( "{$label}: wrote post {$post_id}, but the front end reads {$reads} for theme '{$stylesheet}'\n" );
			dirtbag_playground_stderr( "{$label}: what was written would not render — refusing to report success\n" );
			exit( 1 );
		}
	}
}
