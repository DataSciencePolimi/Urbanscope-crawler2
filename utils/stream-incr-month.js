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
/**
 * Create a new Transform stream that increments the monthly count
 * in the timeline collection so the partial calculations are in
 * sync with the data.
 *
 * @class IncrMonthCount
 * @extends {stream.Transform}
 */
class IncrMonthCount extends stream.Transform {
  /**
   * Creates an instance of IncrMonthCount.
   *
   * @param {string} type
   * @param {string} timelineCollectionName
   */
  constructor( type, timelineCollectionName ) {
    super( { objectMode: true } );

    this.type = type;
    this.timeline = db.get( timelineCollectionName );
    this.fieldName = _.camelCase( 'checked for timeline ' + type );
  }


  /**
   * @typedef MonthYear
   * @type {Object}
   * @property {number} month The month
   * @property {number} year The year
   *
   */
  /**
   * Given a date returns UTC the normalized (1-12) month and year.
   *
   * @param {Date} date
   * @returns {MonthYear} The year and month of the passed date
   */
  getMonth( date ) {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    return { year, month };
  }


  updateMonthlyCount( data ) {
    return this.timeline
    .updateOne( {
      type: data.type,
      lang: data.lang,
      id: data.id,
      year: data.year,
      month: data.month,
    },
    { $inc: { value: 1 } },
    { upsert: true } )
    .catch( err => {
      debug( 'Cannot update anomaly count', err.stack );
    } );
  }

  _transform( post, enc, cb ) {
    const isTwitter = post.source === 'twitter';
    const lang = post.lang;
    const featureId = post[ this.type ]; // Feature ID

    if( isTwitter && featureId && lang && lang !== 'und' ) {
      const data = this.getMonth( post.date );
      data.id = featureId;
      data.lang = lang;
      data.type = this.type;

      return this
      .updateMonthlyCount( data )
      .return( post )
      .asCallback( cb );
    } else {
      return cb( null, post );
    }
  }
}


// Module initialization (at first load)

// Module exports
module.exports = IncrMonthCount;

//  50 6F 77 65 72 65 64  62 79  56 6F 6C 6F 78