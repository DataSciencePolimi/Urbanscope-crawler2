'use strict';
// Load system modules
const stream = require( 'stream' );

// Load modules
const debug = require( 'debug' )( 'UrbanScope:utils:stream-updater' );

// Load my modules
const db = require( 'db-utils' );

// Constant declaration

// Module variables declaration

// Module functions declaration

// Module class declaration
class Saver extends stream.Writable {
  constructor( name, collectionName ) {
    super( { objectMode: true } );

    this.name = name;
    this.collection = db.get( collectionName );
    debug( 'Created saver %s on: %s', this, collectionName );
  }

  // Overrides
  toString() {
    return this.name;
  }

  _write( data, enc, cb ) {
    debug( '%s saving', this, data.id );

    this.collection
    .updateOne( {
      source: data.source,
      id: data.id,
    }, { $set: data } )
    .catch( err => {
      debug( '%s error', this, err );
    } )
    .asCallback( cb );
  }
}


// Module initialization (at first load)

// Module exports
module.exports = Saver;

//  50 6F 77 65 72 65 64  62 79  56 6F 6C 6F 78