'use strict';
// Load system modules

// Load modules
let _ = require( 'lodash' );
let co = require( 'co' );
let Promise = require( 'bluebird' );
let debug = require( 'debug' )( 'UrbanScope:crawler' );
let Funnel = require( 'stream-funnel' );
let Redis = require( 'ioredis' );

// Load my modules
let db = require( 'db-utils' );
let grid = require( './grid/' );
let Twitter = require( './providers/twitter' );
let Instagram = require( './providers/instagram' );
let streamToPromise = require( './utils/stream-to-promise.js' );
let Saver = require( './utils/stream-saver.js' );

// Constant declaration
const CONFIG = require( './config/' );
const MONGO = require( './config/mongo.json' );
const COLLECTIONS = MONGO.collections;
const DB_URL = MONGO.url;
const DB_NAME = MONGO.name;
const COLLECTION = 'posts';

const TW_KEYS = require( './config/keys-twitter.json' );
const IG_KEYS = require( './config/keys-instagram.json' );

const PLACE_ID = CONFIG.place;
const RADIUS = CONFIG.radius;

// Module variables declaration

// Module functions declaration
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

// Module class declaration

// Module initialization (at first load)
// Promise.longStackTraces();

// Entry point
co( function* () {
  // Add the collection mapping/aliases
  db.mapping = COLLECTIONS;

  // Open the DB connection
  yield db.open( DB_URL, DB_NAME );

  debug( 'Ready' );

  let gridPoints = yield getGridPoints( RADIUS );
  // gridPoints = _.sample( gridPoints, 6000 );

  debug( 'Crawling on %d grid points', gridPoints.length );

  let redis = new Redis( {
    keyPrefix: 'UrbanScope:',
  } );



  let loopNum = 0;
  // Start endless loop
  while( true ) {
    loopNum += 1;
    let points = gridPoints.slice();

    // Retrieve the previous state
    let lastTwId = yield redis.hget( 'Twitter', 'lastId' );
    let lastIgLength = yield redis.hget( 'Instagram', 'lastLength' );
    lastIgLength = lastIgLength || gridPoints.length;
    debug( 'Last twitter id: %s', lastTwId );
    debug( 'Last length: %s', lastIgLength );


    debug( '________--------##### STARTING LOOP #####--------________' );
    debug( 'Loop %d started', loopNum );

    debug( 'Creating providers' );
    let providers = [];
    let twStream = new Twitter( TW_KEYS, redis );
    providers.push( twStream );
    let igStream = new Instagram( IG_KEYS, redis );
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
    twStream.start( 'place', PLACE_ID, lastTwId );
    igStream.start( 'geo', points, points.length - Number(lastIgLength) );


    // Wait for all the providers to finish, we simply wait for the collector/funnel
    let waitPromise = streamToPromise( saver );
    debug( 'Waiting the stream to end' );
    yield waitPromise;

    debug( 'Loop %d done', loopNum );
    debug( '________--------##### END LOOP #####--------________' );


    // Clean redis status
    yield redis.hdel( 'Twitter', 'lastId' );
    yield redis.hdel( 'Instagram', 'lastId' );
    yield redis.hset( 'Instagram', 'lastLength', gridPoints.length );

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