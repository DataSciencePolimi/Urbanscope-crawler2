'use strict';
// Load system modules
const fs = require( 'fs' );

// Load modules
const _ = require( 'lodash' );
const co = require( 'co' );
const turf = require( 'turf' );
let parse = require( 'csv-parse' );
const Promise = require( 'bluebird' );
const debug = require( 'debug' )( 'UrbanScope:test' );
// const db = require( 'db-utils' );

// Load my modules

// Constant declaration
const MUNICIPALITIES = require( './config/milan_municipalities.json' );
const NILS = require( './config/milan_nils.json' );
const MONGO = require( './config/mongo.json' );
const COLLECTIONS = MONGO.collections;
const DB_URL = MONGO.url;
const DB_NAME = MONGO.name;
const COLLECTION = 'posts';

const CSV_FILE_NAME = 'data.csv';

// Module variables declaration

// Module functions declaration
function* loadCSV( fileName ) {
  const text = fs.readFileSync( fileName, 'utf8' );

  let [ parsed ] = yield parse( text, {
    columns: true,
  } );


  parsed = _( parsed )
  // .filter( e => !e.Nil )
  .map( e => {
    const nil = e.Nil? 'None' : Number( e.Nil );
    const coords = [ Number( e.Longitude ), Number( e.Latitude ) ];

    const properties = {
      nil: nil,
      date: e.Date,
    }

    return turf.point( coords, properties );
  } )
  .value();

  debug( 'Got %d elements', parsed.length );

  return parsed;
}
// Module class declaration

// Module initialization (at first load)
// Promise.longStackTraces();
parse = Promise.promisify( parse, { multiArgs: true } );

// Entry point
co( function* () {
  // Add the collection mapping/aliases
  // db.mapping = COLLECTIONS;

  // Open the DB connection
  // yield db.open( DB_URL, DB_NAME );

  debug( 'Ready' );

  const milano = MUNICIPALITIES[ 15146 ];
  const features = [];
  const mismatchNil = [];

  const points = yield loadCSV( CSV_FILE_NAME );

  for( const point of points ) {
    const inMilan = turf.inside( point, milano );
    if( !inMilan ) {
      // features.push( point );
    } else {
      let foundNil = 'NONE';
      for( const nilId in NILS ) {
        const nil = NILS[ nilId ];

        if( turf.inside( point, nil ) ) {
          foundNil = Number( nilId );
          break;
        }
      }
      if( point.properties.nil!==foundNil ) {
        mismatchNil.push( foundNil );
        features.push( point );
        debug( 'NIL mismatch %s===%d', point.properties.nil, foundNil );
      }
    }
  }

  for( const id of _.uniq( mismatchNil ) ) {
    features.push( NILS[ id ] );
  }


  const fc = turf.featurecollection( features );
  const json = JSON.stringify( fc, null, 2 );
  fs.writeFileSync( 'data.geojson', json, 'utf8' );

} )
.catch( function( err ) {
  debug( 'FUUUUU', err, err.stack );
} )
// .then( db.close )
;

//  50 6F 77 65 72 65 64  62 79  56 6F 6C 6F 78