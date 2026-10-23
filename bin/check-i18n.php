<?php
/**
 * Check literal WordPress text domains using PHP's own lexical scanner.
 * Development tooling only; PHP 7.2 compatible, no WordPress bootstrap or eval.
 */

function dirtbag_i18n_violations( $source ) {
	$domains = array(
		'__' => 1, '_e' => 1, 'translate' => 1,
		'esc_html__' => 1, 'esc_html_e' => 1, 'esc_attr__' => 1, 'esc_attr_e' => 1, 'esc_xml__' => 1, 'esc_xml_e' => 1,
		'_x' => 2, '_ex' => 2, 'esc_html_x' => 2, 'esc_attr_x' => 2, 'esc_xml_x' => 2, '_n_noop' => 2,
		'translate_with_gettext_context' => 2, 'translate_nooped_plural' => 2,
		'_n' => 3, '_nx_noop' => 3, '_nx' => 4,
	);
	$tokens = array_values( array_filter( token_get_all( $source ), function ( $token ) {
		return ! is_array( $token ) || ! in_array( $token[0], array( T_WHITESPACE, T_COMMENT, T_DOC_COMMENT ), true );
	} ) );
	$hits = array();
	$count = count( $tokens );
	for ( $i = 0; $i < $count; ++$i ) {
		$token = $tokens[ $i ];
		if ( ! is_array( $token ) || ! in_array( token_name( $token[0] ), array( 'T_STRING', 'T_NAME_FULLY_QUALIFIED' ), true ) ) {
			continue;
		}
		$name = strtolower( ltrim( $token[1], '\\' ) );
		if ( ! isset( $domains[ $name ] ) || '(' !== ( $tokens[ $i + 1 ] ?? null ) ) {
			continue;
		}
		$previous = $i - 1;
		// PHP 7 emits a global separator separately; PHP 8 includes it in the name.
		if ( $previous >= 0 && is_array( $tokens[ $previous ] ) && T_NS_SEPARATOR === $tokens[ $previous ][0] ) {
			--$previous;
			if ( $previous >= 0 && is_array( $tokens[ $previous ] )
				&& in_array( $tokens[ $previous ][0], array( T_STRING, T_NAMESPACE ), true ) ) {
				continue;
			}
		}
		if ( $previous >= 0 && '&' === ( is_array( $tokens[ $previous ] ) ? $tokens[ $previous ][1] : $tokens[ $previous ] ) ) {
			--$previous;
		}
		if ( $previous >= 0 && is_array( $tokens[ $previous ] )
			&& in_array( token_name( $tokens[ $previous ][0] ), array( 'T_FUNCTION', 'T_NEW', 'T_OBJECT_OPERATOR', 'T_NULLSAFE_OBJECT_OPERATOR', 'T_DOUBLE_COLON' ), true ) ) {
			continue;
		}
		$args = array();
		$argument = array();
		$depth = 1;
		for ( $end = $i + 2; $end < $count; ++$end ) {
			$part = $tokens[ $end ];
			if ( in_array( $part, array( '(', '[', '{' ), true )
				|| ( is_array( $part ) && in_array( token_name( $part[0] ), array( 'T_CURLY_OPEN', 'T_DOLLAR_OPEN_CURLY_BRACES', 'T_ATTRIBUTE' ), true ) ) ) {
				++$depth;
			} elseif ( in_array( $part, array( ')', ']', '}' ), true ) ) {
				--$depth;
				if ( 0 === $depth ) {
					if ( $argument ) {
						$args[] = $argument;
					}
					break;
				}
			} elseif ( ',' === $part && 1 === $depth ) {
				$args[] = $argument;
				$argument = array();
				continue;
			}
			$argument[] = $part;
		}
		if ( 0 !== $depth ) {
			continue; // Syntax validation is a separate package-check gate.
		}
		$domain = $args[ $domains[ $name ] ] ?? null;
		$reason = null;
		if ( null === $domain ) {
			$reason = 'text domain argument is missing';
		} elseif ( 1 !== count( $domain ) || ! is_array( $domain[0] ) || T_CONSTANT_ENCAPSED_STRING !== $domain[0][0] ) {
			$reason = 'text domain must be a literal string';
		} elseif ( ! in_array( $domain[0][1], array( "'dirtbag'", '"dirtbag"' ), true ) ) {
			$reason = "text domain must be 'dirtbag'";
		}
		if ( $reason ) {
			$hits[] = array( 'line' => $token[2], 'name' => $token[1], 'reason' => $reason );
		}
	}
	return $hits;
}

if ( realpath( $_SERVER['SCRIPT_FILENAME'] ) === __FILE__ ) {
	if ( count( $argv ) < 2 ) {
		fwrite( STDERR, "Usage: php bin/check-i18n.php FILE.php [...]\n" );
		exit( 1 );
	}
	foreach ( array_slice( $argv, 1 ) as $file ) {
		$source = file_get_contents( $file );
		if ( false === $source ) {
			exit( 1 );
		}
		foreach ( dirtbag_i18n_violations( $source ) as $hit ) {
			fwrite( STDERR, "i18n: {$file}:{$hit['line']}: {$hit['reason']} in {$hit['name']}()\n" );
			exit( 1 );
		}
	}
	echo "i18n text domain OK\n";
}
