'use strict';
// Load system modules

// Load modules
const _ = require( 'lodash' );
const ig = require( 'instagram-node' ).instagram;
const HttpProxyAgent = require( 'https-proxy-agent' );
const Promise = require( 'bluebird' );
const debug = require( 'debug' )( 'UrbanScope:accounts:Instagram' );

// Load my modules
const Account = require( './base' );

// Constant declaration
const WINDOW = 1000*60*60; // 1h
const DEFAULT_PARAMS = {
  count: 100, // Only 33 in reality :(
  /* eslint-disable camelcase */
  /* eslint-enable camelcase */
};

// Module variables declaration

// Module functions declaration

// Module class declaration
class InstagramAccount extends Account {
  constructor( key ) {
    super( key, {
      rateLimitDelay: WINDOW,
      name: 'Instagram',
    } );
  }

  // Overrides
  getApi( key ) {
    debug( '%s: get api for', this, key );

    const proxy = process.env.http_proxy
                || process.env.HTTP_PROXY
                || process.env.https_proxy
                || process.env.HTTPS_PROXY;

    const options = {};
    if( proxy ) {
      options.agent = new HttpProxyAgent( proxy );
    }
    const api = ig( options );
    api.use( key );

    return Promise.promisifyAll( api, {
      multiArgs: true,
    } );
  }

  // Methods
  loop( medias ) {
    debug( '%s: got %d medias', this, medias.length );

    if( medias.length===0 ) {
      debug( '%s: no more medias', this );
      return null;
    } else {
      this.send( medias );

      const maxTimestamp = medias[ medias.length-1 ].created_time;
      this.emit( 'status', {
        lastId: maxTimestamp,
      } );
    }

    // Loop not available for location
  }
  get( lat, long, radius ) {
    const opts = _.assign( {}, DEFAULT_PARAMS, {
      distance: radius,
      // 'max_timestamp': maxTimestamp,
    } );

    debug( '%s: making query with options', this, opts );

    return this.api
    .media_searchAsync( lat, long, opts )
    .spread( medias => this.loop( medias ) )
    .catch( err => this.handleError( err, [ lat, long, radius ] ) );
  }

  geo( points, maxTimestamp ) {
    const point = points.shift();

    // No more points, stream finished
    if( !point ) {
      debug( '%s: no more valid points, end', this );
      // this.end();
      // this.emit( 'status', { lastLength: null } );
      return Promise.resolve( null );
    }
    const length = points.length;

    debug( '%s: query for point(%d): ', this, length, point );

    return this.get( point.latitude, point.longitude, point.radius, maxTimestamp )
    .then( ()=> {
      this.emit( 'status', {
        lastLength: length,
      } );
      return this.geo( points, maxTimestamp );
    } )
    // .then( () => this.end() );
  }
}


// Module initialization (at first load)

// Module exports
module.exports = InstagramAccount;

//  50 6F 77 65 72 65 64  62 79  56 6F 6C 6F 78