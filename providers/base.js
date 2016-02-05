'use strict';
// Load system modules
let stream = require( 'stream' );

// Load modules
let _ = require( 'lodash' );
let Funnel = require( 'stream-funnel' );
let debug = require( 'debug' )( 'Providers:Base' );
// let trace = require( 'memon' );

// Load my modules

// Constant declaration

// Module variables declaration

// Module functions declaration

// Module class declaration
class Provider extends stream.PassThrough {
  constructor( name, keys ) {
    super( { objectMode: true } );

    keys = keys || [];
    if( !Array.isArray( keys ) ) {
      keys = [ keys ];
    }

    this.name = name;
    this.accounts = _.map( keys, this.createAccount, this );
    this.wrapper = this.createWrapper();
    debug( 'Created provider %s with %d accounts', this, this.accounts.length );
  }

  // Overrides
  toString() {
    return this.name;
  }

  // Abstract
  createAccount() { throw new Error( 'Must implement createAccount()' ); }
  createWrapper() { throw new Error( 'Must implement createWrapper()' ); }

  // Methods
  geo( points, currentIndex ) {
    if( !Array.isArray( points ) ) {
      points = [ points ];
    }
    currentIndex = Number( currentIndex );
    if( isNaN( currentIndex ) ) {
      currentIndex = 0;
    }

    // Use only the pionts needed (also create a shallow copy)
    points = points.slice( currentIndex );

    debug( 'Starting from index: %d', currentIndex );
    // trace( this.toString()+' starting GEO' );

    let funnel = new Funnel( 'Geo data' );

    // Start each account
    for( let account of this.accounts ) {
      debug( 'Starting geo on %s', account );
      funnel.add( account );
      account.geo( points );
    }
    // trace( 'Started '+this.toString()+' accounts' );

    // Gather all data and send them as myself :)
    funnel
    .pipe( this.wrapper )
    .pipe( this );
  }
  start( action, data, other ) {
    action = ( action || '' ).toLowerCase();

    debug( 'Starting action: %s', action );

    if( action==='geo' ) {
      this.geo( data, other );
    } else {
      throw new Error( `Action "${action}" not supported` );
    }
  }
}


// Module initialization (at first load)

// Module exports
module.exports = Provider;

//  50 6F 77 65 72 65 64  62 79  56 6F 6C 6F 78