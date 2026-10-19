<?php
/**
 * Read-only design audit. Run with wp eval-file /absolute/path/to/this-file.php.
 * Lists IDs, slugs, status and owning theme only; never content or credentials.
 * No options, posts, templates or caches are changed by this script.
 *
 * @package ComponentContracts
 */

if ( ! defined( 'ABSPATH' ) || ! defined( 'WP_CLI' ) || ! WP_CLI ) {
	exit( 1 );
}
// Keep temporary audit variables out of the caller's global scope.
( static function () {
	$component_audit_rows = array();
	foreach ( array( 'wp_template', 'wp_template_part', 'wp_global_styles', 'wp_block' ) as $component_audit_type ) {
		$component_audit_posts = get_posts(
			array(
				'post_type'      => $component_audit_type,
				'post_status'    => array( 'publish', 'draft', 'pending', 'private', 'future' ),
				'posts_per_page' => -1,
				'orderby'        => 'ID',
				'order'          => 'ASC',
			)
		);
		foreach ( $component_audit_posts as $component_audit_post ) {
			$component_audit_themes = wp_get_object_terms( $component_audit_post->ID, 'wp_theme', array( 'fields' => 'names' ) );
			$component_audit_rows[] = array(
				'id'     => $component_audit_post->ID,
				'type'   => $component_audit_type,
				'slug'   => $component_audit_post->post_name,
				'status' => $component_audit_post->post_status,
				'themes' => is_wp_error( $component_audit_themes ) ? array() : $component_audit_themes,
			);
		}
	}//end foreach
	echo wp_json_encode(
		array(
			'active_theme'   => get_stylesheet(),
			'records'        => $component_audit_rows,
			'interpretation' => 'Review records before deployment; existence alone is not a conflict. Global styles include valid variation choices. Synced patterns are content, not automatically design violations. Detached pattern instances are not detected.',
		),
		JSON_PRETTY_PRINT
	) . "\n";
} )();
