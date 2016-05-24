'use strict';
// Load system modules
const stream = require( 'stream' );

// Load modules
const _ = require( 'lodash' );
const Promise = require( 'bluebird' );
const Funnel = require( 'stream-funnel' );
const debug = require( 'debug' )( 'UrbanScope:providers:Base' );

// Load my modules
const Wrapper = require( '../utils/stream-wrapper' );

// Constant declaration
const DONE_DELAY = 1000*60*1; // 1 min

// Module variables declaration

// Module functions declaration

// Module class declaration
class Provider extends stream.PassThrough {
  constructor( keys, options ) {
    super( { objectMode: true } );

    options = options || {};
    keys = keys || [];
    if( !Array.isArray( keys ) ) {
      keys = [ keys ];
    }

    // Properties
    this.doneDelay = options.doneDelay || DONE_DELAY;
    this.name = options.name;
    this.redis = options.redis;

    this.accounts = _.map( keys, k => this.createAccount( k ) );
    debug( 'Created provider %s with %d accounts', this, this.accounts.length );

    for( const account of this.accounts ) {
      account.on( 'status', status => this._updateStatus( status ) );
    }

    // Connect wrapper
    this.wrapper = new Wrapper( this.name );
    this.wrapper.pipe( this );
  }

  // Overrides
  toString() {
    return this.name;
  }

  // Abstract
  createAccount() { throw new Error( 'Must implement createAccount()' ); }

  // Methods
  _updateStatus( status ) {
    this.redis.hmset( this, status );
  }
  _wrapCall( method ) {
    const funnel = new Funnel( { objectMode: true } );

    // Prepare all accounts
    funnel.addSources( this.accounts );

    // Gather all data and send them as myself :)
    funnel
    .pipe( this.wrapper, { end: false } ); // Do not send the end event

    // Onche the funnel ends, unplug the wrapper
    funnel.on( 'end', () => {
      funnel.unpipe( this.wrapper );
    } );

    // Start all accounts
    const args = [].slice.call( arguments, 1 );
    const promises = [];
    for( const account of this.accounts ) {
      const promise = account[ method ].apply( account, args ); // Call function on account
      promises.push( promise );
    }
    return Promise.all( promises )
    .then( () => {
      // unplug all the accounts from the funnel
      for( const account of this.accounts ) {
        funnel.sourceFinished( account );
      }
    } )
  }
  geo( points, status ) {
    if( !Array.isArray( points ) ) {
      points = [ points ];
    }
    debug( '%s: performing geo requests of %d points', this, points.length );

    let currentIndex = status.startPoint;
    currentIndex = Number( currentIndex );
    if( isNaN( currentIndex ) ) {
      currentIndex = 0;
    }
    debug( '%s: starting from index %d', this, currentIndex );

    // Use only the pionts needed (also create a shallow copy)
    points = points.slice( currentIndex );

    return this._wrapCall( 'geo', points, status.lastId );
  }
  place( placeId, status ) {
    debug( '%s: performing place requests of %s', this, placeId );

    return this._wrapCall( 'place', placeId, status.lastId );
  }

  // Entry point
  start( action, data, other ) {
    other = other || {};
    action = ( action || '' ).toLowerCase();

    debug( '%s: starting action: %s', this, action );

    let promise = Promise.resolve();
    if( action==='geo' ) {
      promise = this.geo( data, other );
    } else if( action==='place' ) {
      promise = this.place( data, other );
    } else {
      promise = Promise.reject( new Error( `Action "${action}" not supported` ) );
    }

    promise
    .tap( () => debug( '%s: finished', this ) )
    .delay( this.doneDelay ) // Wait
    .then( () => this.start( action, data, other ) ) // REDO
    .catch( err => debug( '%s: error', this, err.stack ) );
  }
}


// Module initialization (at first load)

// Module exports
module.exports = Provider;

//  50 6F 77 65 72 65 64  62 79  56 6F 6C 6F 78