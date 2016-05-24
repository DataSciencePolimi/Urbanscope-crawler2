'use strict';
// Load system modules
const stream = require( 'stream' );

// Load modules
const _ = require( 'lodash' );
// let debug = require( 'debug' )( 'UrbanScope:utils:stream increment anomaly count' );

// Load my modules

// Constant declaration

// Module variables declaration

// Module functions declaration

// Module class declaration
class IncrAnomalyCount extends stream.Transform {
  constructor( type, redis ) {
    super( { objectMode: true } );

    this.redis = redis;
    this.type = type;
    this.fieldName = _.camelCase( 'checkedForAnomalies '+type );
  }

  getKey( post ) {
    const id = post[ this.type ];
    const date = post.date;
    const year = date.getUTCFullYear();
    const trimester = Math.floor( date.getUTCMonth()/3 );

    return `anomaly-${year}-${trimester}-${this.type}-${id}`;
  }


  _transform( post, enc, cb ) {
    const isTwitter = post.source==='twitter';
    const lang = post.lang;
    const featureId = post[ this.type ]; // Feature ID


    // Should have feature id and valid language to proceed
    if( isTwitter && featureId && lang && lang!=='und' ) {
      const key = this.getKey( post );

      return this.redis
      .hincrby( key, lang, 1 )
      .then( ()=> {
        // Set the "checked for anomalies" field
        post[ this.fieldName ] = true;
        return post;
      } )
      .asCallback( cb, { spead: true } );
    } else {
      return cb( null, post );
    }
  }
}


// Module initialization (at first load)

// Module exports
module.exports = IncrAnomalyCount;

//  50 6F 77 65 72 65 64  62 79  56 6F 6C 6F 78