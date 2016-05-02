'use strict';
// Load system modules
const stream = require( 'stream' );

// Load modules
// const debug = require( 'debug' )( 'UrbanScope:utils:stream increment monthly count' );

// Load my modules

// Constant declaration
const KEY = 'timeline';

// Module variables declaration

// Module functions declaration

// Module class declaration
class IncrMonthCount extends stream.Transform {
  constructor( redis ) {
    super( { objectMode: true } );

    this.redis = redis;
  }

  getKey( post ) {
    const lang = post.lang;
    return `${KEY}-${lang}`;
  }
  getField( post ) {
    const date = post.date;
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    return `${year}-${month}`;
  }


  _transform( post, enc, cb ) {
    const isTwitter = post.source==='twitter';
    const lang = post.lang;

    if( isTwitter && lang && lang!=='und' ) {
      const key = this.getKey( post );
      const field = this.getField( post );
      return this.redis
      .hincrby( key, field, 1 )
      .return( post )
      .asCallback( cb, { spread: true } );
    } else {
      return cb( null, post );
    }
  }
}


// Module initialization (at first load)

// Module exports
module.exports = IncrMonthCount;

//  50 6F 77 65 72 65 64  62 79  56 6F 6C 6F 78