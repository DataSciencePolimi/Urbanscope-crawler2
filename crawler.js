'use strict';
// Load system modules

// Load modules
const _ = require( 'lodash' );
const co = require( 'co' );
const Promise = require( 'bluebird' );
const debug = require( 'debug' )( 'UrbanScope:crawler' );
const Redis = require( 'ioredis' );

// Load my modules
const db = require( 'db-utils' );
const Twitter = require( './providers/twitter' );
const Instagram = require( './providers/instagram' );
const Saver = require( './utils/stream-saver.js' );
const pipeline = require( './pipeline' );

// Constant declaration
const CONFIG = require( './config/' );
const REDIS_CONFIG = require( './config/redis.json' );
const MONGO_CONFIG = require( './config/mongo.json' );
const GRID_POINTS = require( './config/grid.json' );
const COLLECTIONS = MONGO_CONFIG.collections;
const DB_URL = MONGO_CONFIG.url;
const DB_NAME = MONGO_CONFIG.name;
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
  const fc = GRID_POINTS;

  // Convert to plain array of usable points
  const points = _( fc.features )
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
/*
function* resetStatus( redisInstance, points ) {
  yield redisInstance.hdel( 'Twitter', 'lastId' );
  yield redisInstance.hdel( 'Instagram', 'maxTimestamp' );
  yield redisInstance.hset( 'Instagram', 'lastLength', points );
}
*/
function startTwitterPlace( redisInstance, keys, placeId ) {
  const dataStream = new Twitter( redisInstance, TW_KEYS );

  dataStream.start( 'place', placeId );
  return dataStream;
}
function startTwitterPoints( redisInstance, keys, points ) {
  const dataStream = new Twitter( redisInstance, TW_KEYS );

  dataStream.start( 'geo', points );
  return dataStream;
}
function startInstagram( redisInstance, keys, points ) {
  const dataStream = new Instagram( redisInstance, IG_KEYS );

  dataStream.start( 'geo', points );
  return dataStream;
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
  gridPoints = _.sampleSize( gridPoints, 600 );

  debug( 'Crawling on %d grid points', gridPoints.length );


  // Reset current status
  yield removeStatus( redis );



  /* HIGH LEVEL PIPELINE SCHEMA
  TW -> +
        |
       (+) -> PIPELINE -> DB
        |
  IG -> +
  */

  // Create write stram
  const saveToDb = new Saver( COLLECTION );

  // Create the data streams
  const twitterDataStream = startTwitterPlace( redis, TW_KEYS, PLACE_ID );
  // const twitterDataStream = startTwitterPoints( redis, TW_KEYS, gridPoints.slice() );
  // Start instagram, provide a shallow copy of the data array
  // const instagramDataStream = startInstagram( redis, IG_KEYS, gridPoints.slice() );

  // Push the data recieved in the saver stream
  pipeline( [
    twitterDataStream,
    // instagramDataStream,
  ] )
  .pipe( saveToDb );

} )
.catch( err => {
  debug( 'FUUUUU', err, err.stack );

  return Promise.all( db.close(), redis.quit() )
  .then( () => process.exit( 1 ) ); // O_O
} );

//  50 6F 77 65 72 65 64  62 79  56 6F 6C 6F 78