'use strict';
// Load system modules
let stream = require( 'stream' );

// Load modules
let _ = require( 'lodash' );
let co = require( 'co' );
let db = require( 'db-utils' );
let Redis = require( 'ioredis' );
let debug = require( 'debug' )( 'UrbanScope:update' );

// Load my modules
let streamToPromise = require( './utils/stream-to-promise' );

// Constant declaration
const MUNICIPALITIES = require( './config/milan_municipalities.json' );
const NILS = require( './config/milan_nils.json' );

const REDIS_CONFIG = require( './config/redis.json' );

const MONGO = require( './config/mongo.json' );
const COLLECTIONS = MONGO.collections;
const DB_URL = MONGO.url;
const DB_NAME = MONGO.name;

// Module variables declaration

// Module class declaration
class AnomaliesUpdater extends stream.Writable {
  constructor( collectionName, type ) {
    super( { objectMode: true } );

    this.collectionName = collectionName;
    this.type = type;

    this.key = _.camelCase( 'checkedForAnomalies '+type );
  }

  _write( tweet, enc, cb ) {
    let id = tweet.id;

    return db.update( this.collectionName, {
      id: id,
    }, {
      [ this.key ]: true,
    } )
    .asCallback( cb );
  }
}
class AnomaliesCounter extends stream.Transform {
  constructor( redis, type ) {
    super( { objectMode: true } );

    this.redis = redis;
    this.type = type;
  }

  getKey( tweet ) {
    let nil = tweet.nil;
    let date = tweet.date;
    let year = date.getUTCFullYear();
    let trimester = Math.floor( date.getUTCMonth()/3 );

    return `anomaly-${year}-${trimester}-${this.type}-${nil}`;
  }

  _transform( tweet, enc, cb ) {
    let key = this.getKey( tweet );
    let lang = tweet.lang;

    // debug( 'Increment %s:%s', key, lang );

    return this.redis
    .hincrby( key, lang, 1 )
    .return( tweet )
    .asCallback( cb );
  }
}

// Module functions declaration
function* initDB() {
  // Add the collection mapping/aliases
  db.mapping = COLLECTIONS;

  // Open the DB connection
  yield db.open( DB_URL, DB_NAME );
}
function* updateMunicipalities( collectionName, municipalities ) {

  for( let municipality of municipalities ) {
    debug( 'Check if must update municipality "%s"', municipality.properties.COMUNE );

    let municipalityId = municipality.properties.PRO_COM;
    let geometry = municipality.geometry;

    let filter = {
      municipality: null,
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

    if( num===0 ) continue;
    debug( 'Updating %d tweets to municipality "%d"', num, municipalityId );

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
function* updateNils( collectionName, nils ) {
  for( let nil of nils ) {
    let nilId = nil.properties.ID_NIL;
    debug( 'Check if must update nil "%s"', nilId );

    let geometry = nil.geometry;

    let filter = {
      nil: null,
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

    if( num===0 ) continue;
    debug( 'Updating %d tweets to nil %d', num, nilId );

    let results = yield db
    .get( collectionName )
    .updateMany( filter, {
      $set: {
        nil: nilId
      },
    } );

    debug( 'Update result: %j', results );
  }
}
function* updateAnomaliesNils( collectionName, nils, redis ) {
  for( let nil of nils ) {
    let nilId = nil.properties.ID_NIL;
    debug( 'Check anomalies for "%s"', nilId );

    let updateCounter = new AnomaliesCounter( redis, 'nil' );
    let updateTweet = new AnomaliesUpdater( collectionName, 'nil' );

    let tweetsStream = db
    .get( collectionName )
    .find( {
      nil: nilId,
      checkedForAnomaliesNil: null,
      lang: { $nin: [ 'und', null ] },
    } )
    .hint( 'Nil' )
    .stream();

    let waitStream = tweetsStream
    .pipe( updateCounter )
    .pipe( updateTweet )
    ;

    yield streamToPromise( waitStream );
  }
}
function* updateAnomaliesNils( collectionName, municipalities, redis ) {
  for( let municipality of municipalities ) {
    let municipalityId = municipality.properties.ID_NIL;
    debug( 'Check anomalies for "%s"', municipalityId );

    let updateCounter = new AnomaliesCounter( redis, 'municipality' );
    let updateTweet = new AnomaliesUpdater( collectionName, 'municipality' );

    let tweetsStream = db
    .get( collectionName )
    .find( {
      municipality: municipalityId,
      checkedForAnomaliesMunicipality: null,
      lang: { $nin: [ 'und', null ] },
    } )
    .hint( 'Municipality' )
    .stream();

    let waitStream = tweetsStream
    .pipe( updateCounter )
    .pipe( updateTweet )
    ;

    yield streamToPromise( waitStream );
  }
}


// Module initialization (at first load)
// Promise.longStackTraces();

// Entry point
co( function* () {
  yield initDB();
  debug( 'Ready' );

  debug( 'Updating municipalities' );
  // yield updateMunicipalities( COLLECTIONS.posts, _.map( MUNICIPALITIES ) );
  debug( 'Update municipalities done' );

  debug( 'Updating nils' );
  // yield updateNils( COLLECTIONS.posts, _.map( NILS ) );
  debug( 'Update nils done' );

  let redis = new Redis( REDIS_CONFIG );
  debug( 'Updating nil anomalies' );
  yield updateAnomaliesNils( COLLECTIONS.posts, _.map( NILS ), redis );
  debug( 'Update nil anomalies done' );


  debug( 'Update done' );

  yield redis.quit();
} )
.catch( function( err ) {
  debug( 'FUUUUU', err, err.stack );
} )
.then( db.close )
;

//  50 6F 77 65 72 65 64  62 79  56 6F 6C 6F 78