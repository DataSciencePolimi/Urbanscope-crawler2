'use strict';
// Load system modules

// Load modules
const _ = require( 'lodash' );
const co = require( 'co' );
const Promise = require( 'bluebird' );
const debug = require( 'debug' )( 'UrbanScope:crawler' );
const Funnel = require( 'stream-funnel' );
const Redis = require( 'ioredis' );

// Load my modules
const db = require( 'db-utils' );
const grid = require( './grid/' );
const Twitter = require( './providers/twitter' );
const Instagram = require( './providers/instagram' );
const streamToPromise = require( './utils/stream-to-promise.js' );
const Saver = require( './utils/stream-saver.js' );
const pipeline = require( './pipeline' );

// Constant declaration
const CONFIG = require( './config/' );
const REDIS_CONFIG = require( './config/redis.json' );
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
const redis = new Redis( REDIS_CONFIG );

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
function* removeStatus( redisInstance ) {
  yield redisInstance.del( 'Twitter' );
  yield redisInstance.del( 'Instagram' );
}
function* resetStatus( redisInstance, points ) {
  yield redisInstance.hdel( 'Twitter', 'lastId' );
  yield redisInstance.hdel( 'Instagram', 'maxTimestamp' );
  yield redisInstance.hset( 'Instagram', 'lastLength', points );

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

  yield removeStatus( redis );


  let loopNum = 0;

  // Start endless loop
  for(;;) {
    loopNum += 1;
    let points = gridPoints.slice();

    // Retrieve the previous state
    let lastTwId = yield redis.hget( 'Twitter', 'lastId' );
    let lastIgId = yield redis.hget( 'Instagram', 'lastId' );
    let lastIgLength = yield redis.hget( 'Instagram', 'lastLength' );
    lastIgLength = lastIgLength || gridPoints.length;
    debug( 'Last twitter id: %s', lastTwId );
    debug( 'Last Instagram id: %s', lastIgId );
    debug( 'Last Instagram length: %s', lastIgLength );


    debug( '________--------##### STARTING LOOP #####--------________' );
    debug( 'Loop %d started', loopNum );

    debug( 'Creating providers' );
    let twStream = new Twitter( TW_KEYS, redis );
    let igStream = new Instagram( IG_KEYS, redis );

    // Create stream saver
    let saveToDb = new Saver( `${COLLECTION} saver`, COLLECTION );

    // Create funnel to collect all data
    let funnel = new Funnel( `Funnel loop ${loopNum}` );

    // push the data recieved in the saver stream
    let waitStream = pipeline( funnel, redis )
    .pipe( saveToDb );

    // Collect data from all the providers
    funnel.add( twStream );
    funnel.add( igStream );

    debug( 'Starting providers' );
    twStream.start( 'place', PLACE_ID, {
      lastId: lastTwId,
    } );
    igStream.start( 'geo', points, {
      lastId: lastIgId,
      startPoint: points.length - Number(lastIgLength),
    } );


    // Wait for all the providers to finish, we simply wait for the collector/funnel
    let waitPromise = streamToPromise( waitStream );
    debug( 'Waiting the stream to end' );
    yield waitPromise;

    debug( 'Loop %d done', loopNum );
    debug( '________--------##### END LOOP #####--------________' );


    // Clean redis status
    yield resetStatus( redis, gridPoints.length );

    // Wait 5 seconds, just in case
    yield Promise.delay( 5000 );
  }
} )
.catch( err => debug( 'FUUUUU', err, err.stack ) )
.then( () => Promise.all( db.close(), redis.close() ) )

//  50 6F 77 65 72 65 64  62 79  56 6F 6C 6F 78