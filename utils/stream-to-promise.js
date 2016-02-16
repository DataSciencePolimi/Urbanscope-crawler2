'use strict';
// Load system modules

// Load modules
let Promise = require( 'bluebird' );
let debug = require( 'debug' )( 'UrbanScope:utils:stream to promise' );

// Load my modules

// Constant declaration


// Module variables declaration

// Module functions declaration
function streamToPromise( stream, emitErrors ) {
  debug( 'Converting "%s" to promise', stream );

  // stream.on( 'end', () => debug( '%s ended', stream ) );
  // stream.on( 'finish', () => debug( '%s finish', stream ) );
  // stream.on( 'error', () => debug( '%s error', stream ) );

  // Create a Promise that will be resolved when the stream
  // emits the 'end' (or 'finish') event
  let promise = new Promise( ( res, rej )=> {

    stream.on( 'end', res );
    stream.on( 'finish', res );
    /*
    if( stream.readable ) {
      stream.on( 'end', ()=> {
        debug( '%s resolved(end)', this );
        res();
      } );
    } else if( stream.writable ) {
      stream.on( 'finish', () => {
        debug( '%s resolved(finish)', this );
        res();
      } );
    }
    */

    if( emitErrors===true ) {
      stream.on( 'error', rej );
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