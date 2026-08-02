<?php
/**
 * Diagnostic output for the dev/test scripts, portable across SAPIs.
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
	 * Every such call sat on an error path, so the fatal replaced the very message
	 * that would have explained the failure: a boot that could not find its
	 * global-styles post died as `Undefined constant "STDERR"` instead of saying
	 * so, which is how it stayed unexplained through several CI rounds.
	 *
	 * The `php://stderr` wrapper works under both SAPIs and is what actually
	 * surfaces in CI — the Playground server's output is captured to a log the
	 * workflow prints on a failed boot. `error_log()` is only a fallback; its
	 * output has not been observed reaching the CI logs from inside Playground.
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
