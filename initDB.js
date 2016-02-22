'use strict';
// Load system modules

// Load modules
let _ = require( 'lodash' );
let co = require( 'co' );
let Promise = require( 'bluebird' );
let debug = require( 'debug' )( 'UrbanScope:initDB' );

// Load my modules
let db = require( 'db-utils' );

// Constant declaration
const MONGO = require( './config/mongo.json' );
const INDEXES = require( './config/mongo_indexes.json' );
const COLLECTIONS = MONGO.collections;
const DB_URL = MONGO.url;
const DB_NAME = MONGO.name;

// Module variables declaration

// Module functions declaration

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



  debug( 'Drop indexes' );
  for( let collection of db ) {
    yield db.get( collection ).dropIndexes();
  }



  debug( 'Init indexes' );
  // Verify that all the indexes are in place
  for( let collectionName of _.keys( INDEXES ) ) {
    let indexes = INDEXES[ collectionName ];
    yield db.indexes( collectionName, indexes );
  }



  debug( 'Rebuild indexes' );
  for( let collection of db ) {
    // yield db.get( collection ).reIndex();
  }

  debug( 'DONE' );
} )
.catch( function( err ) {
  debug( 'FUUUUU', err, err.stack );
} )
.then( db.close )
;

//  50 6F 77 65 72 65 64  62 79  56 6F 6C 6F 78