<?php
require dirname( __DIR__, 2 ) . '/bin/check-i18n.php';

$cases = json_decode( file_get_contents( dirname( __DIR__ ) . '/fixtures/i18n.json' ), true );
if ( ! is_array( $cases ) || ! $cases ) {
	fwrite( STDERR, "i18n fixtures are missing or invalid\n" );
	exit( 1 );
}
foreach ( $cases as $index => $case ) {
	$hits = dirtbag_i18n_violations( $case['source'] );
	if ( count( $hits ) !== $case['expected'] ) {
		fwrite( STDERR, 'i18n fixture ' . $index . ': expected ' . $case['expected'] . ', got ' . count( $hits ) . ' for ' . json_encode( $case['source'] ) . "\n" );
		exit( 1 );
	}
}
$hits = dirtbag_i18n_violations( "<p>HTML</p>\n<?php\n\\ESC_HTML__( 'Label', 'wrong' );" );
if ( 3 !== $hits[0]['line'] || 'text domain must be \'dirtbag\'' !== $hits[0]['reason'] ) {
	fwrite( STDERR, "i18n diagnostic line/reason regression\n" );
	exit( 1 );
}
echo 'i18n tokenizer tests OK (' . ( count( $cases ) + 1 ) . " assertions)\n";
