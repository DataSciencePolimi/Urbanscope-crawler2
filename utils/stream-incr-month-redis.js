'use strict';
// Load system modules
let stream = require( 'stream' );

// Load modules
let debug = require( 'debug' )( 'UrbanScope:utils:stream increment monthly count' );

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
    let lang = post.lang;
    return `${KEY}-${lang}`;
  }
  getField( post ) {
    let date = post.date;
    let year = date.getUTCFullYear();
    let month = date.getUTCMonth() + 1;
    return `${year}-${month}`;
  }


  _transform( post, enc, cb ) {
    let isTwitter = post.source==='twitter';
    let lang = post.lang;

    if( isTwitter && lang && lang!=='und' ) {
      let key = this.getKey( post );
      let field = this.getField( post );
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