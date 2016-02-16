'use strict';
// Load system modules
let stream = require( 'stream' );

// Load modules
let _ = require( 'lodash' );
let Funnel = require( 'stream-funnel' );
let debug = require( 'debug' )( 'UrbanScope:providers:Base' );
let Redis = require( 'ioredis' );

// Load my modules

// Constant declaration

// Module variables declaration

// Module functions declaration

// Module class declaration
class Provider extends stream.PassThrough {
  constructor( name, keys, redis ) {
    super( { objectMode: true } );

    keys = keys || [];
    if( !Array.isArray( keys ) ) {
      keys = [ keys ];
    }

    if( !redis ) {
      redis = new Redis();
    }
    this.redis = redis;

    this.name = name;
    this.accounts = _.map( keys, this.createAccount, this );
    this.wrapper = this.createWrapper();
    debug( 'Created provider %s with %d accounts', this, this.accounts.length );

    for( let account of this.accounts ) {
      account.on( 'status', status => this._updateStatus( status ) );
    }
  }

  // Overrides
  toString() {
    return this.name;
  }

  // Abstract
  createAccount() { throw new Error( 'Must implement createAccount()' ); }
  createWrapper() { throw new Error( 'Must implement createWrapper()' ); }

  // Methods
  _updateStatus( status ) {
    this.redis.hmset( this.name, status );
  }
  _wrapCall( method ) {
    let funnel = new Funnel( `${method} data` );

    // Prepare all accounts
    for( let account of this.accounts ) {
      funnel.add( account );
    }

    // Gather all data and send them as myself :)
    funnel
    .pipe( this.wrapper )
    .pipe( this );

    // Start all accounts
    let args = Array.prototype.slice.call( arguments, 1 );
    for( let account of this.accounts ) {
      account[ method ].apply( account, args ); // Call function on account
    }
  }
  geo( points, currentIndex ) {
    if( !Array.isArray( points ) ) {
      points = [ points ];
    }
    debug( '%s: performing geo requests of %d points', this, points.length );

    currentIndex = Number( currentIndex );
    if( isNaN( currentIndex ) ) {
      currentIndex = 0;
    }
    debug( '%s: starting from index %d', this, currentIndex );

    // Use only the pionts needed (also create a shallow copy)
    points = points.slice( currentIndex );

    this._wrapCall( 'geo', points );
  }
  place( placeId, lastId ) {
    debug( '%s: performing place requests of %s', this, placeId );

    this._wrapCall( 'place', placeId, lastId );
  }

  // Entry point
  start( action, data, other ) {
    action = ( action || '' ).toLowerCase();

    debug( 'Starting action: %s', action );

    if( action==='geo' ) {
      this.geo( data, other );
    } else if( action==='place' ) {
      this.place( data, other );
    } else {
      throw new Error( `Action "${action}" not supported` );
    }
  }
}


// Module initialization (at first load)

// Module exports
module.exports = Provider;

//  50 6F 77 65 72 65 64  62 79  56 6F 6C 6F 78