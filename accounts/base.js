'use strict';
// Load system modules
let stream = require( 'stream' );

// Load modules
let debug = require( 'debug' )( 'UrbanScope:accounts:Base' );

// Load my modules

// Constant declaration

// Module variables declaration

// Module functions declaration

// Module class declaration
class Account extends stream.Readable {
  constructor( name, key ) {
    super( { objectMode: true } );

    this.name = name;
    this.api = this.getApi( key );

    debug( 'Created account %s', this );
  }

  // Overrides
  _read() {}
  toString() {
    return this.name;
  }

  // Abstract
  getApi() { throw new Error( 'Must implement getApi()' ); }


  // Methods
  send( data ) {
    if( !Array.isArray( data ) ) {
      data = [ data ];
    }

    for( let d of data ) {
      if( d ) this.push( d );
    }
  }
  end() {
    debug( '%s stream ended', this );
    this.push( null );
  }
}


// Module initialization (at first load)

// Module exports
module.exports = Account;

//  50 6F 77 65 72 65 64  62 79  56 6F 6C 6F 78