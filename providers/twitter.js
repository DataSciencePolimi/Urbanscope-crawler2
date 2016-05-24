'use strict';
// Load system modules

// Load modules
const debug = require( 'debug' )( 'UrbanScope:providers:Twitter' );

// Load my modules
const Account = require( './accounts/twitter' );
const Provider = require( './base' );

// Constant declaration

// Module variables declaration

// Module functions declaration

// Module class declaration
class Twitter extends Provider {
  constructor( redis, keys ) {
    super( keys, {
      redis: redis,
      name: 'Twitter',
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
module.exports = Twitter;

//  50 6F 77 65 72 65 64  62 79  56 6F 6C 6F 78