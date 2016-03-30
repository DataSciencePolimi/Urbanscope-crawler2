'use strict';
// Load system modules
let stream = require( 'stream' );

// Load modules
let _ = require( 'lodash' );
let turf = require( 'turf' );
let debug = require( 'debug' )( 'UrbanScope:utils:stream nil identifier' );

// Load my modules

// Constant declaration
const NILS = _.map( require( '../config/milan_nils.json' ) );
const MILAN_MUNICIPALITY = 15146;

// Module variables declaration

// Module functions declaration

// Module class declaration
class NilIdentifier extends stream.Transform {
  constructor() {
    super( { objectMode: true } );
  }

  _transform( post, enc, cb ) {

    // Check only in Milan area
    if( post.municipality===MILAN_MUNICIPALITY ) {
      let point = {
        type: 'Feature',
        geometry: post.location,
      };

      for( let nil of NILS ) {
        let nilId = nil.properties.ID_NIL;

        if( turf.inside( point, nil ) ) {
          debug( 'Found municipality %d', nilId );
          // Ok found inside!!!
          post.nil = nilId;
          break;
        }
      }

    }

    return cb( null, post );
  }
}


// Module initialization (at first load)

// Module exports
module.exports = NilIdentifier;

//  50 6F 77 65 72 65 64  62 79  56 6F 6C 6F 78