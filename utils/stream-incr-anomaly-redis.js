'use strict';
// Load system modules
const stream = require( 'stream' );

// Load modules
const _ = require( 'lodash' );
const db = require( 'db-utils' );
const debug = require( 'debug' )( 'UrbanScope:utils:stream-inc-anomaly' );

// Load my modules

// Constant declaration

// Module variables declaration

// Module functions declaration

// Module class declaration
class IncrAnomalyCount extends stream.Transform {
  constructor( type, anomaliesCollectionName ) {
    super( { objectMode: true } );

    this.type = type;
    this.collection = db.get( anomaliesCollectionName );
    this.fieldName = _.camelCase( 'checked for anomalies '+type );
  }

  getTrimester( date ) {
    const year = date.getUTCFullYear();
    const trimester = Math.floor( date.getUTCMonth()/3 );

    return { year, trimester };
  }


  incrementAnomalyCount( data ) {
    return this.collection
    .updateOne( {
      type: data.type,
      year: data.year,
      trimester: data.trimester,
      lang: data.lang,
      id: data.id,
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


    // Should have feature id and valid language to proceed
    if( isTwitter && featureId && lang && lang!=='und' ) {

      const data = this.getTrimester( post.date );
      data.id = featureId;
      data.lang = lang;
      data.type = this.type;

      return this.incrementAnomalyCount( data )
      /*
      return this.redis
      .hincrby( key, lang, 1 )
      */
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