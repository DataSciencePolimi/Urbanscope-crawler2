'use strict';
// Load system modules
const stream = require( 'stream' );

// Load modules
const Promise = require( 'bluebird' );
const debug = require( 'debug' )( 'UrbanScope:accounts:Base' );

// Load my modules

// Constant declaration
const SOFT_DELAY = 1000*60; // 1 Minute
const RATE_LIMIT_DELAY = 1000*60*15; // 15 Minutes
const RATE_LIMIT_CODE = 429; // err.code for Rate limit

// Module variables declaration

// Module functions declaration

// Module class declaration
class Account extends stream.Readable {
  constructor( key, options ) {
    super( { objectMode: true } );

    options = options || {};

    this.timeoutDelay = options.timeoutDelay || SOFT_DELAY;
    this.rateLimitDelay = options.rateLimitDelay || RATE_LIMIT_DELAY;
    this.rateLimitCode = options.rateLimitCode || RATE_LIMIT_CODE;
    this.name = options.name;

    this.api = this.getApi( key );
    debug( 'Created account for %s', this );
  }

  // Overrides
  _read() {}
  toString() {
    return this.name;
  }

  // Abstract
  getApi() { throw new Error( 'Must implement getApi()' ); }


  // Methods
  handleRateLimitError( err, data ) {
    debug( '%s: rate limit', this );

    // On rate-limit repeat the request
    return Promise
    .delay( this.rateLimitDelay )
    // Redo the same query
    .then( () => this.get.apply( this, data ) );
  }
  handleTimeoutError( err, data ) {
    debug( '%s: timeout, retry', this );

    // Repeat the request
    return Promise
    .delay( this.timeoutDelay ) // Wait, just in case
    // Redo the same query
    .then( () => this.get.apply( this, data ) );
  }
  handleError( err, query ) {
    if( err.code===this.rateLimitCode ) {
      return this.handleRateLimitError( err, query );
    } else if( err.errno==='ETIMEDOUT' ) {
      return this.handleTimeoutError( err, query );
    }

    debug( '%s: error', this, err, err.stack );
    // On error do not repeat the request
    return null;
  }
  send( data ) {
    if( !Array.isArray( data ) ) {
      data = [ data ];
    }

    for( const d of data ) {
      if( d ) this.push( d );
    }
  }
}


// Module initialization (at first load)

// Module exports
module.exports = Account;

//  50 6F 77 65 72 65 64  62 79  56 6F 6C 6F 78