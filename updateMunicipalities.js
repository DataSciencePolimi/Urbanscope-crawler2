'use strict';
// Load system modules

// Load modules
let _ = require( 'lodash' );
let co = require( 'co' );
let debug = require( 'debug' )( 'UrbanScope:update municipalities' );

// Load my modules
let db = require( 'db-utils' );

// Constant declaration
const MUNICIPALITIES = require( './config/milan_municipalities.json' );

const MONGO = require( './config/mongo.json' );
const COLLECTIONS = MONGO.collections;
const DB_URL = MONGO.url;
const DB_NAME = MONGO.name;

// Module variables declaration

// Module functions declaration
function* initDB() {
  // Add the collection mapping/aliases
  db.mapping = COLLECTIONS;

  // Open the DB connection
  yield db.open( DB_URL, DB_NAME );
}
function* updateMunicipalities( collectionName, municipalities ) {

  for( let municipality of municipalities ) {
    debug( 'Updating municipality for "%s"', municipality.properties.COMUNE );

    let municipalityId = municipality.properties.PRO_COM;
    let geometry = municipality.geometry;

    let filter = {
      location: {
        $geoWithin: {
          $geometry: geometry,
        },
      }
    };

    let num = yield db
    .get( collectionName )
    .find( filter )
    .count();

    debug( 'Updating %d tweets to %s', num, municipalityId );

    let results = yield db
    .get( collectionName )
    .updateMany( filter, {
      $set: {
        municipality: municipalityId
      },
    } );

    debug( 'Update result: %j', results );
  }

}

// Module class declaration

// Module initialization (at first load)
// Promise.longStackTraces();

// Entry point
co( function* () {
  yield initDB();

  debug( 'Ready' );

  yield updateMunicipalities( COLLECTIONS.posts, _.map( MUNICIPALITIES ) );
  debug( 'Update done' );
} )
.catch( function( err ) {
  debug( 'FUUUUU', err, err.stack );
} )
.then( db.close )
;

//  50 6F 77 65 72 65 64  62 79  56 6F 6C 6F 78