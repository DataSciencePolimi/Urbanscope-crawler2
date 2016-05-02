'use strict';
// Load system modules
const stream = require( 'stream' );

// Load modules
const _ = require( 'lodash' );
const turf = require( 'turf' );
const debug = require( 'debug' )( 'UrbanScope:utils:stream-municipality-identifier' );

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
    const placeName = _.get( post, 'raw.place.name' );
    debug( 'For place: %s', placeName );
    debug( 'Location: ', post.location );

    // Check for precise location
    if( post.location ) {
      const point = {
        type: 'Feature',
        geometry: post.location,
      };

      // Got location, check the municipality
      for( const municipality of MUNICIPALITIES ) {
        const municipalityId = municipality.properties.PRO_COM;

        if( turf.inside( point, municipality ) ) {
          debug( 'Found municipality with location %d', municipalityId );
          // Ok found inside!!!
          post.municipality = municipalityId;
          break;
        }
      }


    // Use place information
    } else if( placeName ) {
      const foundPlace = _.find( MUNICIPALITIES, {
        properties: { COMUNE: placeName },
      } );

      if( foundPlace ) {
        const municipalityId = _.get( foundPlace, 'properties.PRO_COM' );
        debug( 'Found municipality with name: %d', municipalityId );
        debug( 'Found Place', foundPlace );

        post.municipality = municipalityId;
      }


    }

    // If no location, skip


    return cb( null, post );
  }
}


// Module initialization (at first load)

// Module exports
module.exports = MunicipalityIdentifier;

//  50 6F 77 65 72 65 64  62 79  56 6F 6C 6F 78