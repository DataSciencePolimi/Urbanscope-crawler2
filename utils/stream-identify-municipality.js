'use strict';
// Load system modules
let stream = require( 'stream' );

// Load modules
let _ = require( 'lodash' );
let turf = require( 'turf' );
let debug = require( 'debug' )( 'UrbanScope:utils:stream municipality identifier' );

// Load my modules

// Constant declaration
const MUNICIPALITIES = _.map( require( '../config/milan_municipalities.json' ) );


// Module variables declaration

// Module functions declaration

// Module class declaration
class MunicipalityIdentifier extends stream.Transform {
  constructor() {
    super( { objectMode: true } );
  }

  _transform( post, enc, cb ) {
    let point = {
      type: 'Feature',
      geometry: post.location,
    };

    // If no location, skip
    if( point.geometry ) {

      // Got location, check the municipality
      for( let municipality of MUNICIPALITIES ) {
        let municipalityId = municipality.properties.PRO_COM;

        if( turf.inside( point, municipality ) ) {
          debug( 'Found municipality %d', municipalityId );
          // Ok found inside!!!
          post.municipality = municipalityId;
          break;
        }
      }
    }

    return cb( null, post );
  }
}


// Module initialization (at first load)

// Module exports
module.exports = MunicipalityIdentifier;

//  50 6F 77 65 72 65 64  62 79  56 6F 6C 6F 78