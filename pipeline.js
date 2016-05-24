'use strict';
// Load system modules

// Load modules
const Funnel = require( 'stream-funnel' );

// Load my modules
const NilIdentifier = require( './utils/stream-identify-nil.js' );
const MunicipalityIdentifier = require( './utils/stream-identify-municipality.js' );
const IncrMonthCount = require( './utils/stream-incr-month-redis.js' );
const IncrAnomalyCount = require( './utils/stream-incr-anomaly-redis.js' );

// Constant declaration

// Module variables declaration

// Module functions declaration
function joinSources( sources ) {
  const funnel = new Funnel( { objectMode: true } );
  funnel.addSources( sources );
  return funnel;
}
function pipeline( redis /*, ...sources */ ) {
  const sources = [].slice.call( arguments, 1 );
  const dataStream = joinSources( sources );

  const nilIdentifier = new NilIdentifier();
  const municipalityIdentifier = new MunicipalityIdentifier();
  const incrMonthCount = new IncrMonthCount( redis );
  const incrNilAnomalyCount = new IncrAnomalyCount( 'nil', redis );
  const incrMunicipalityAnomalyCount = new IncrAnomalyCount( 'municipality', redis );


  /* HIGH LEVEL PIPELINE SCHEMA
  SOURCE_1 ->(+)
              |
  SOURCE_2 ->(+)
              | -> DATA_STREAM
  SOURCE_3 ->(+)
              |
  SOURCE_N ->(+)
  */

  /* HIGH LEVEL PIPELINE SCHEMA
  DATA_STREAM ->
  -> IDENTIFY MUNICIPALITY -> IDENTIFY NIL ->
  -> MONTH COUNT ->
  -> ANOMALY NIL -> ANOMALY MUNICIPALITY -> ...
  */


  return dataStream
  // Add municipality to the post
  .pipe( municipalityIdentifier )
  // Add NIL to the post
  .pipe( nilIdentifier )
  // Increment the monthly count in Redis
  .pipe( incrMonthCount )
  // Increment the NIL anomaly count in Redis
  .pipe( incrNilAnomalyCount )
  // Increment the Municipality anomaly count in Redis
  .pipe( incrMunicipalityAnomalyCount );
}
// Module class declaration

// Module initialization (at first load)
// Promise.longStackTraces();

// Module exports
module.exports = pipeline;

//  50 6F 77 65 72 65 64  62 79  56 6F 6C 6F 78