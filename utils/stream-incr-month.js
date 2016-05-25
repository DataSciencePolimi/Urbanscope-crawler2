'use strict';
// Load system modules
const stream = require( 'stream' );

// Load modules
const _ = require( 'lodash' );
const db = require( 'db-utils' );
const debug = require( 'debug' )( 'UrbanScope:utils:stream-inc-monthly' );

// Load my modules

// Constant declaration

// Module variables declaration

// Module functions declaration

// Module class declaration
class IncrMonthCount extends stream.Transform {
  constructor( type, timelineCollectionName ) {
    super( { objectMode: true } );

    this.type = type;
    this.collection = db.get( timelineCollectionName );
    this.fieldName = _.camelCase( 'checked for timeline '+type );
  }


  getMonth( date ) {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    return { year, month };
  }

  incrementMonthlyCount( data ) {
    return this.collection
    .updateOne( {
      type: data.type,
      lang: data.lang,
      id: data.id,
      year: data.year,
      month: data.month,
    }, {
      $inc: {
        value: 1, // Increment by 1
      },
    }, {
      upsert: true, // Create entry if missing
    } )
    .catch( err => {
      debug( 'Cannot update anomaly count', err.stack );
    } );
  }


  _transform( post, enc, cb ) {
    const isTwitter = post.source==='twitter';
    const lang = post.lang;
    const featureId = post[ this.type ]; // Feature ID

    if( isTwitter && featureId && lang && lang!=='und' ) {
      const data = this.getMonth( post.date );
      data.id = featureId;
      data.lang = lang;
      data.type = this.type;

      return this.incrementMonthlyCount( data )
      /*
      return this.redis
      .hincrby( key, field, 1 )
      */
      .then( () => {
        // Set the "checked for timeline" field
        post[ this.fieldName ] = true;
        return post;
      } )
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