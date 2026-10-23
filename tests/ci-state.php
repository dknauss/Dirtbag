<?php
/** CI-only state endpoint, installed into the disposable Playground by the blueprint. */
add_action( 'rest_api_init', function () {
	register_rest_route( 'dirtbag-ci/v1', '/state', array(
		'methods' => 'GET',
		'permission_callback' => '__return_true',
		'callback' => function () {
			$live = WP_Theme_JSON_Resolver::get_user_data_from_wp_global_styles( wp_get_theme(), false );
			$id = isset( $live['ID'] ) ? (int) $live['ID'] : 0;
			$terms = $id ? wp_get_object_terms( $id, 'wp_theme', array( 'fields' => 'names' ) ) : array();
			return array(
				'wp' => get_bloginfo( 'version' ),
				'php' => PHP_VERSION,
				'automatic_updates_disabled' => defined( 'AUTOMATIC_UPDATER_DISABLED' ) && AUTOMATIC_UPDATER_DISABLED,
				'cron_disabled' => defined( 'DISABLE_WP_CRON' ) && DISABLE_WP_CRON,
				'stylesheet' => get_stylesheet(),
				'post_id' => $id,
				'terms' => is_wp_error( $terms ) ? array() : $terms,
				'payload' => $id ? json_decode( get_post_field( 'post_content', $id ), true ) : null,
				'receipt' => get_option( 'dirtbag_ci_style_receipt', null ),
			);
		},
	) );
} );
