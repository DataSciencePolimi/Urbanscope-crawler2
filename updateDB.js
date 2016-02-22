'use strict';
// Load system modules

// Load modules
let co = require( 'co' );
let Promise = require( 'bluebird' );
let debug = require( 'debug' )( 'UrbanScope:updateDB' );

// Load my modules
let db = require( 'db-utils' );

// Constant declaration
const MONGO = require( './config/mongo.json' );
const COLLECTIONS = MONGO.collections;
const DB_URL = MONGO.url;
const DB_NAME = MONGO.name;
const COLLECTION = 'posts';

// Module variables declaration

// Module functions declaration
function* updateCommon( collection ) {
  let data = yield db
  .find( collection, {
    timestamp: null,
  }, {
    date: 1,
  } )
  .toArray();
  debug( 'Got %d elements', data.length );
  if( data.length===0 ) return;

  let c = db.get( collection );
  let bulk = c.initializeUnorderedBulkOp();

  for( let d of data ) {
    bulk
    .find( { _id: d._id } )
    .updateOne( {
      $set: {
        timestamp: d.date.getTime(),
      },
    } );
  }

  debug( 'Update "date" field in bulk' );
  yield bulk.execute();
}
function* updateTwitter( collection ) {
}
function* updateInstagram( collection ) {
  let data = yield db
  .find( collection, {
    source: 'instagram',
    link: null,
  }, {
    'raw.link': 1,
  } )
  .toArray();
  debug( 'Got %d media', data.length );
  if( data.length===0 ) return;


  let c = db.get( COLLECTION );
  let bulk = c.initializeUnorderedBulkOp();

  for( let d of data ) {
    bulk
    .find( { _id: d._id } )
    .updateOne( {
      $set: {
        link: d.raw.link? d.raw.link : undefined,
      },
    } );
  }

  debug( 'Update "link" field in bulk' );
  yield bulk.execute();
}
// Module class declaration

// Module initialization (at first load)
Promise.longStackTraces();

// Entry point
co( function* () {
  debug( 'Ready' );

  // Add the collection mapping/aliases
  db.mapping = COLLECTIONS;

  // Open the DB connection
  debug( 'Open DB' );
  yield db.open( DB_URL, DB_NAME );


  yield updateCommon( COLLECTION );
  yield updateTwitter( COLLECTION );
  yield updateInstagram( COLLECTION );


  debug( 'DONE' );
} )
.catch( function( err ) {
  debug( 'FUUUUU', err, err.stack );
} )
.then( db.close )
;

//  50 6F 77 65 72 65 64  62 79  56 6F 6C 6F 78