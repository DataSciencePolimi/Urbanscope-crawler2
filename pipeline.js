'use strict';
// Load system modules

// Load modules
const Funnel = require( 'stream-funnel' );

// Load my modules
const NilIdentifier = require( './utils/stream-identify-nil.js' );
const MunicipalityIdentifier = require( './utils/stream-identify-municipality.js' );
const IncrMonthCount = require( './utils/stream-incr-month-redis.js' );

// Constant declaration
const TIMELINE = 'timeline';

// Module variables declaration

// Module functions declaration
function joinSources( sources ) {
  const funnel = new Funnel( { objectMode: true } );
  funnel.addSources( sources );
  return funnel;
}
function pipeline( sources ) {
  const dataStream = joinSources( sources );

  const nilIdentifier = new NilIdentifier();
  const municipalityIdentifier = new MunicipalityIdentifier();
  const incrNilMonthCount = new IncrMonthCount( 'nil', TIMELINE );
  const incrMunicipalityMonthCount = new IncrMonthCount( 'municipality', TIMELINE );
  // const incrNilAnomalyCount = new IncrAnomalyCount( 'nil', ANOMALIES );
  // const incrMunicipalityAnomalyCount = new IncrAnomalyCount( 'municipality', ANOMALIES );


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
  */


  return dataStream
  // Add municipality to the post
  .pipe( municipalityIdentifier )
  // Add NIL to the post
  .pipe( nilIdentifier )
  // Increment the NIL monthly count
  .pipe( incrNilMonthCount )
  // Increment the Municipality monthly count
  .pipe( incrMunicipalityMonthCount )

  /*
  // Increment the NIL anomaly count in Redis
  // .pipe( incrNilAnomalyCount )
  // Increment the Municipality anomaly count in Redis
  // .pipe( incrMunicipalityAnomalyCount );
  */
}
// Module class declaration

// Module initialization (at first load)
// Promise.longStackTraces();

// Module exports
module.exports = pipeline;

//  50 6F 77 65 72 65 64  62 79  56 6F 6C 6F 78