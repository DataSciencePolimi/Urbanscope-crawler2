'use strict';
// Load system modules

// Load modules

// Load my modules
const NilIdentifier = require( './utils/stream-identify-nil.js' );
const MunicipalityIdentifier = require( './utils/stream-identify-municipality.js' );
const IncrMonthCount = require( './utils/stream-incr-month-redis.js' );
const IncrAnomalyCount = require( './utils/stream-incr-anomaly-redis.js' );

// Constant declaration

// Module variables declaration

// Module functions declaration
function pipeline( postStream, redis ) {
  const nilIdentifier = new NilIdentifier();
  const municipalityIdentifier = new MunicipalityIdentifier();
  const incrMonthCount = new IncrMonthCount( redis );
  const incrNilAnomalyCount = new IncrAnomalyCount( 'nil', redis );
  const incrMunicipalityAnomalyCount = new IncrAnomalyCount( 'municipality', redis );

  return postStream
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