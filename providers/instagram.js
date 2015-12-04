'use strict';
// Load system modules

// Load modules
let debug = require( 'debug' )( 'Providers:Instagram' );

// Load my modules
let Account = require( '../accounts/instagram' );
let Wrapper = require( '../utils/stream-wrapper' );

// Constant declaration
let Provider = require( './base' );

// Module variables declaration

// Module functions declaration

// Module class declaration
class Instagram extends Provider {
  constructor( keys ) {
    super( 'Instagram', keys );

    debug( 'Done' );
  }

  // Overrides
  createAccount( key ) {
    debug( 'Creating account for', key );

    let account = new Account( key );
    return account;
  }

  createWrapper() {
    let wrapper = new Wrapper( `${this.name} wrapper`, 'instagram' );
    return wrapper;
  }
}


// Module initialization (at first load)

// Module exports
module.exports = Instagram;

//  50 6F 77 65 72 65 64  62 79  56 6F 6C 6F 78