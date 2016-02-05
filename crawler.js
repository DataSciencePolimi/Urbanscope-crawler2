'use strict';
// Load system modules

// Load modules
let _ = require( 'lodash' );
let co = require( 'co' );
let Promise = require( 'bluebird' );
let debug = require( 'debug' )( 'Crawler' );
let Funnel = require( 'stream-funnel' );
// let trace = require( 'memon' );

// Load my modules
let db = require( 'db-utils' );
let grid = require( './grid/' );
let Twitter = require( './providers/twitter' );
let Instagram = require( './providers/instagram' );
let streamToPromise = require( './utils/stream-to-promise.js' );
let Saver = require( './utils/stream-saver.js' );

// Constant declaration
const MONGO = require( './config/mongo.json' );
const INDEXES = require( './config/mongo_indexes.json' );
const COLLECTIONS = MONGO.collections;
const DB_URL = MONGO.url;
const DB_NAME = MONGO.name;
const MUNICIPALITIES = require( './config/milan_municipalities.json' );
const TW_KEYS = require( './config/keys-twitter.json' );
const IG_KEYS = require( './config/keys-instagram.json' );
const RADIUS = 200;
const COLLECTION = 'posts';

// Module variables declaration

// Module functions declaration
function* initDB() {
  // Add the collection mapping/aliases
  db.mapping = COLLECTIONS;

  // Open the DB connection
  yield db.open( DB_URL, DB_NAME );

  // Verify that all the indexes are in place
  for( let collectionName of _.keys( INDEXES ) ) {
    let indexes = INDEXES[ collectionName ];
    yield db.indexes( collectionName, indexes );
  }

}
function* getGridPoints( radius ) {
  debug( 'Get grid with %d meters radius', radius );

  // Get grid points as FeatureCollection list of Points
  let fc = yield grid.get( radius );

  // Convert to plain array of usable points
  let points = _( fc.features )
  .map( 'geometry.coordinates' )
  .map( coords => ( {
    longitude: coords[ 0 ],
    latitude: coords[ 1 ],
    radius: radius,
  } ) )
  .value();

  debug( 'Generated %d points', points.length );
  return points;
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

  return 5;
}

// Module class declaration

// Module initialization (at first load)
// Promise.longStackTraces();

// Entry point
co( function* () {
  yield initDB();

  debug( 'Ready' );

  let points = yield getGridPoints( RADIUS );
  // points = _.sample( points, 6000 );

  debug( 'Crawling on %d grid points', points.length );


  let loopNum = 0;
  // Start endless loop
  while( true ) {
    loopNum += 1;

    // trace( 'Loop '+loopNum+' started' );
    debug( '________--------##### STARTING LOOP #####--------________' );
    debug( 'Loop %d started', loopNum );

    debug( 'Creating providers' );
    let providers = [];
    let twStream = new Twitter( TW_KEYS );
    providers.push( twStream );
    let igStream = new Instagram( IG_KEYS );
    providers.push( igStream );

    // Create stream saver
    let saver = new Saver( `${COLLECTION} saver`, COLLECTION );

    // Create funnel to collect all data
    let funnel = new Funnel( `Funnel loop ${loopNum}` );

    // push the data recieved in the saver stream
    funnel.pipe( saver );

    // Collect data from all the providers
    funnel.add( twStream );
    funnel.add( igStream );

    debug( 'Starting providers' );
    for( let provider of providers ) {
      debug( 'Starting provider "%s"', provider );
      let index = grid.index( provider.toString() );
      provider.start( 'geo', points, index );
    }
    // trace( 'Providers started' );


    // Wait for all the providers to finish, we simply wait for the collector/funnel
    let waitPromise = streamToPromise( saver );
    debug( 'Waiting the stream to end' );
    yield waitPromise;
    // trace( 'Wait promise done' );

    debug( 'Loop %d done', loopNum );
    debug( '________--------##### END LOOP #####--------________' );


    yield updateMunicipalities( COLLECTIONS.posts, _.map( MUNICIPALITIES ) );
    debug( 'Update done' );

    // Wait 5 seconds, just in case
    yield Promise.delay( 5000 );
  }




  debug( 'DONE' );
} )
.catch( function( err ) {
  debug( 'FUUUUU', err, err.stack );
} )
.then( db.close )
;

//  50 6F 77 65 72 65 64  62 79  56 6F 6C 6F 78