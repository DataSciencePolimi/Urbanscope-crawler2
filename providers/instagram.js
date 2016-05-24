'use strict';
// Load system modules

// Load modules
const debug = require( 'debug' )( 'UrbanScope:providers:Instagram' );

// Load my modules
const Account = require( './accounts/instagram' );
const Provider = require( './base' );

// Constant declaration

// Module variables declaration

// Module functions declaration

// Module class declaration
class Instagram extends Provider {
  constructor( redis, keys ) {
    super( keys, {
      redis: redis,
      name: 'Instagram',
    } );
  }

  // Overrides
  createAccount( key ) {
    debug( '%s: creating account with', this, key );
    return new Account( key );
  }
}


// Module initialization (at first load)

// Module exports
module.exports = Instagram;

//  50 6F 77 65 72 65 64  62 79  56 6F 6C 6F 78