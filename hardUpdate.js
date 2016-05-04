'use strict';
// Load system modules

// Load modules
const co = require( 'co' );
const Promise = require( 'bluebird' );
const debug = require( 'debug' )( 'UrbanScope:hard-udate' );
const Redis = require( 'ioredis' );

// Load my modules
const db = require( 'db-utils' );
const streamToPromise = require( './utils/stream-to-promise.js' );
const Updater = require( './utils/stream-updater.js' );
const pipeline = require( './pipeline' );

// Constant declaration
const REDIS_CONFIG = require( './config/redis.json' );
const MONGO = require( './config/mongo.json' );
const COLLECTIONS = MONGO.collections;
const DB_URL = MONGO.url;
const DB_NAME = MONGO.name;
const COLLECTION = 'posts';

// Module variables declaration
const redis = new Redis( REDIS_CONFIG );

// Module functions declaration

// Module class declaration

// Module initialization (at first load)
// Promise.longStackTraces();

// Entry point
co( function* () {
  // Add the collection mapping/aliases
  db.mapping = COLLECTIONS;

  // Open the DB connection
  yield db.open( DB_URL, 'Test' );

  debug( 'Ready' );
  const updatePost = new Updater( `${COLLECTION} updater`, COLLECTION );
  yield redis.flushall();

  const collection = db.get( COLLECTION );

  const dataStream = collection.find().stream();

  // push the data recieved in the saver stream
  const waitStream = pipeline( dataStream, redis )
  .pipe( updatePost );


  // Wait for all the providers to finish, we simply wait for the collector/funnel
  const waitPromise = streamToPromise( waitStream );
  debug( 'Waiting the stream to end' );
  yield waitPromise;
  debug( 'All done, bye' );
} )
.catch( err => debug( 'FUUUUU', err, err.stack ) )
.then( () => Promise.all( db.close(), redis.quit() ) )

//  50 6F 77 65 72 65 64  62 79  56 6F 6C 6F 78