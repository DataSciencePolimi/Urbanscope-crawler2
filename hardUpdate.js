'use strict';
// Load system modules
const PassThrough = require( 'stream' ).PassThrough;
const Transform = require( 'stream' ).Transform;


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
function close() {
  const quitRedis = Promise.promisify( redis.quit, {
    context: redis,
  } )

  return Promise.all( [
    db.close(),
    quitRedis(),
  ] );
}
// Module class declaration
class FixSource extends Transform {
  constructor() {
    super( { objectMode: true } )
    this.total = 0;
  }
  _transform( data, enc, cb ) {
    data.source = data.source || data.provider;
    return cb( null, data );
  }
}
class Log extends PassThrough {
  constructor() {
    super( { objectMode: true } )
    this.total = 0;
  }

  _transform( data, enc, cb ) {
    this.total += 1;
    debug( 'Parsed %d posts', this.total );
    return cb( null, data );
  }
}

// Module initialization (at first load)
// Promise.longStackTraces();

// Entry point
co( function* () {
  // Add the collection mapping/aliases
  db.mapping = COLLECTIONS;

  // Open the DB connection
  yield db.open( DB_URL, DB_NAME );

  // Clear all redis
  yield redis.flushall();


  debug( 'Ready' );
  const updatePost = new Updater( `${COLLECTION} updater`, COLLECTION );


  const collection = db.get( COLLECTION );
  const dataStream = collection.find( {
    /*
    date: {
      $gte: moment( { y: 2016, month: 2 } ).startOf( 'month' ).toDate(),
      $lte: moment( { y: 2016, month: 4 } ).endOf( 'month' ).toDate(),
    }
    */
  } )
  .stream()
  .pipe( new FixSource() );

  // push the data recieved in the update stream
  const waitStream = pipeline( redis, dataStream )
  .pipe( new Log() )
  .pipe( updatePost );


  // Wait for all the providers to finish, we simply wait for the collector/funnel
  const waitPromise = streamToPromise( waitStream );
  debug( 'Waiting the stream to end' );
  yield waitPromise;
  debug( 'All done, bye' );
} )
.catch( err => debug( 'FUUUUU', err, err.stack ) )
.then( close )

//  50 6F 77 65 72 65 64  62 79  56 6F 6C 6F 78