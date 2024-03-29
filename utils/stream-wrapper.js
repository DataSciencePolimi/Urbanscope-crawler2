'use strict';
// Load system modules
const stream = require( 'stream' );

// Load modules
const wrapPost = require( '@volox/social-post-wrapper' ).default;
const debug = require( 'debug' )( 'UrbanScope:utils:stream wrapper' );

// Load my modules

// Constant declaration
const WRAP_OPTS = {
  field: 'source',
};

// Module variables declaration

// Module functions declaration

// Module class declaration
class Saver extends stream.Transform {
  constructor( provider ) {
    super( { objectMode: true } );

    this.provider = provider.toLowerCase();
    debug( 'Created wrapper for %s', provider );
  }

  // Overrides
  _transform( data, enc, cb ) {
    debug( '%s wrapping', this, data.id );

    const post = wrapPost( data, this.provider, WRAP_OPTS );
    return cb( null, post );
  }
}


// Module initialization (at first load)

// Module exports
module.exports = Saver;

//  50 6F 77 65 72 65 64  62 79  56 6F 6C 6F 78