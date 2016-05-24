'use strict';
// Load system modules
const querystring = require( 'querystring' );

// Load modules
const _ = require( 'lodash' );
const Twit = require( 'twit' );
const Promise = require( 'bluebird' );
const debug = require( 'debug' )( 'UrbanScope:accounts:Twitter' );

// Load my modules
const Account = require( './base' );

// Constant declaration
const RATE_LIMIT_CODE = 88; // err.code for Rate limit
const WINDOW = 1000*60*15; // 15 Minutes
const DEFAULT_PARAMS = {
  count: 100,
  /* eslint-disable camelcase */
  results_per_page: 100,
  result_type: 'recent',
  include_entities: 1,
  /* eslint-enable camelcase */
};

// Module variables declaration

// Module functions declaration

// Module class declaration
class TwitterAccount extends Account {
  constructor( key ) {
    super( key, {
      rateLimitCode: RATE_LIMIT_CODE,
      rateLimitDelay: WINDOW,
      name: 'Twitter',
    } );
  }

  // Overrides
  getApi( key ) {
    debug( '%s: get api for', this, key );

    const api = new Twit( key ); // Already supports promises
    return api;
  }

  // Methods
  loop( data ) {
    const tweets = data.statuses;
    debug( '%s: got %d tweets', this, tweets.length );


    if( tweets.length===0 ) {
      debug( '%s: no more tweets', this );
      return null;
    } else {
      this.send( tweets );

      const lastId = tweets[ tweets.length-1 ].id_str;
      this.emit( 'status', {
        lastId: lastId,
      } );
    }

    const metadata = data.search_metadata;
    debug( '%s: got meta', this, metadata );

    if( metadata.next_results ) {
      const params = metadata.next_results.slice( 1 );
      const query = querystring.parse( params );
      debug( '%s: next: ', this, query );

      return this.get( query );
    }

    return null;
  }
  get( query ) {
    query = _.assign( {}, DEFAULT_PARAMS, query );

    debug( '%s: making query', this, query );

    return this.api
    .get( 'search/tweets', query )
    .then( result => this.loop( result.data ) )
    .catch( err => this.handleError( err, query ) );
  }

  geo( points ) {
    const point = points.shift();

    // No more points, stream finished
    if( !point ) {
      debug( '%s: no more valid points, end', this );
      return Promise.resolve( null );
    }

    const length = points.length;
    debug( '%s: query for point(%d): ', this, length, point );

    const radius = point.radius/1000; // convert in km
    const geocode = `geocode:${point.latitude},${point.longitude},${radius}km`;
    debug( '%s: geocode: "%s"', this, geocode );
    const options = {
      q: geocode,
    };

    return this.get( options )
    .then( ()=> {
      this.emit( 'status', {
        lastLength: length,
      } );
      return this.geo( points );
    } )
    // .then( () => this.end() );
  }

  place( placeId, lastId ) {
    const query = `place:${placeId}`;
    debug( '%s: query "%s"', this, query );

    const options = {
      q: query,
    };

    if( lastId ) {
      options[ 'max_id' ] = lastId;
    }


    return this.get( options )
    // .then( ()=> this.end() )
  }
}


// Module initialization (at first load)

// Module exports
module.exports = TwitterAccount;

//  50 6F 77 65 72 65 64  62 79  56 6F 6C 6F 78