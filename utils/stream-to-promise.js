'use strict';
// Load system modules

// Load modules
const Promise = require( 'bluebird' );
const debug = require( 'debug' )( 'UrbanScope:utils:stream to promise' );

// Load my modules

// Constant declaration


// Module variables declaration

// Module functions declaration
function streamToPromise( stream, emitErrors ) {
  debug( 'Converting "%s" to promise', stream );

  // Create a Promise that will be resolved when the stream
  // emits the 'end' (or 'finish') event
  const promise = new Promise( ( res, rej )=> {

    stream.once( 'end', res );
    stream.once( 'finish', res );

    if( emitErrors===true ) {
      stream.once( 'error', rej );
    }
  } );

  return promise
  .then( () => debug( 'Promise done' ) );
}


// Module class declaration

// Module initialization (at first load)

// Module exports
module.exports = streamToPromise;

//  50 6F 77 65 72 65 64  62 79  56 6F 6C 6F 78