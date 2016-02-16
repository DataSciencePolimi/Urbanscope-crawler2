'use strict';
// Load system modules

// Load modules
let _ = require( 'lodash' );
let ig = require( 'instagram-node' ).instagram;
let Promise = require( 'bluebird' );
let debug = require( 'debug' )( 'UrbanScope:accounts:Instagram' );

// Load my modules
let Account = require( './base' );

// Constant declaration
const WINDOW = 1000*60*60; // 1h
const DEFAULT_PARAMS = {
  count: 100, // Only 33 in reality :(
  /* eslint-disable camelcase */
  /* eslint-enable camelcase */
};

// Module variables declaration
let i = 1;

// Module functions declaration

// Module class declaration
class InstagramAccount extends Account {
  constructor( key ) {
    super( 'Instagram '+(i++), key );

    debug( 'Done' );
  }

  // Overrides
  getApi( key ) {
    debug( '%s get api for', this, key );

    let api = ig();
    api.use( key );

    return Promise.promisifyAll( api, {
      multiArgs: true,
    } );
  }

  // Methods
  loop( medias ) {
    debug( '%s got %d medias', this, medias.length );

    if( medias.length===0 ) {
      debug( '%s no more medias', this );
      return null;
    } else {
      this.send( medias );

      let lastId = medias[ medias.length-1 ].id;
      this.emit( 'status', {
        lastId: lastId,
      } );
    }

    // Loop not available for location
  }
  get( lat, long, radius ) {
    let opts = _.assign( {}, DEFAULT_PARAMS, {
      distance: radius,
    } );

    debug( '%s making query with options', this, opts );

    return this.api
    .media_searchAsync( lat, long, opts )
    .bind( this )
    .spread( this.loop )
    .catch( err => {
      if( err.code===429 ) {
        debug( '%s rate limit', this );

        // On rate-limit repeat the request
        return Promise
        .delay( WINDOW )
        // Redo the same query
        .then( () => this.get( lat, long, radius ) );
      }

      debug( '%s error', this, err, err.stack );
      // On error do not repeat the request
    } )

  }
  geo( points ) {

    let point = points.shift();
    // No more points, stream finished
    if( !point ) {
      debug( '%s no more valid points, end', this );
      this.end();
      this.emit( 'status', { lastLength: null } );
      return;
    }
    let length = points.length;

    debug( '%s query for point(%d): ', this, points.length, point );

    this.get( point.latitude, point.longitude, point.radius )
    .then( ()=> {
      this.geo( points );
      this.emit( 'status', {
        lastLength: length,
      } );
    } );
  }
}


// Module initialization (at first load)

// Module exports
module.exports = InstagramAccount;

//  50 6F 77 65 72 65 64  62 79  56 6F 6C 6F 78