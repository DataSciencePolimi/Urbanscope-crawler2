'use strict';
// Load system modules
let url = require( 'url' );

// Load modules
let _ = require( 'lodash' );
let co = require( 'co' );
let moment = require( 'moment' );
let request = require( 'request' );
let Promise = require( 'bluebird' );
let debug = require( 'debug' )( 'UrbanScope:clarifai' );

// Load my modules
let db = require( 'db-utils' );

// Constant declaration
const CLARIFAI = require( './config/clarifai.json' );
const MONTH_LIMIT = CLARIFAI.monthLimit;
const CLIENT_ID = CLARIFAI.key.clientId;
const CLIENT_SECRET = CLARIFAI.key.clientSecret;
const CLARIFAI_MODEL = CLARIFAI.model;
const NUM_DAYS = 31; // Better to exceed

const MONGO = require( './config/mongo.json' );
const COLLECTIONS = MONGO.collections;
const DB_URL = MONGO.url;
const DB_NAME = MONGO.name;

const API_HOSTNAME = 'api.clarifai.com';
const API_BASEPATH = '/v1/';


// Module variables declaration

// Module functions declaration
function* initDB() {
  // Add the collection mapping/aliases
  db.mapping = COLLECTIONS;

  // Open the DB connection
  yield db.open( DB_URL, DB_NAME );
}
function getRequest() {
  // Generate baseURL
  let baseUrl = url.format( {
    protocol: 'https',
    hostname: API_HOSTNAME,
    pathname: API_BASEPATH,
  } );
  debug( 'BaseURL: %s', baseUrl );

  // Generate request
  let req = request.defaults( {
    baseUrl: baseUrl,
    headers: {
      Host: API_HOSTNAME,
    },
    json: true,
  } );
  return Promise.promisify( req, { multiArgs: true } );
}
function* getTags( req, token, image ) {
  // curl "https://api.clarifai.com/v1/tag/?model=general-v1.3&url=https://samples.clarifai.com/metro-north.jpg" \
  //  -H "Authorization: Bearer {access_token}"
  let data = yield req( {
    method: 'GET',
    uri: 'tag',
    qs: {
      model: CLARIFAI_MODEL,
      local_id: image.id, // eslint-disable-line camelcase
      url: image.url,
    },
    headers: {
      Authorization: `Bearer ${token}`,
    }
  } );

  let body = data[ 1 ];
  let results = body.results;
  debug( 'Request done', body );

  let tags = results[ 0 ].result.tag;
  debug( 'Tags', tags );

  return tags;
}
function* getApplicationToken( req ) {
  let data = yield req( {
    method: 'POST',
    uri: 'token',
    qs: {
      client_id: CLIENT_ID,             // eslint-disable-line camelcase
      client_secret: CLIENT_SECRET,     // eslint-disable-line camelcase
      grant_type: 'client_credentials', // eslint-disable-line camelcase
    },
  } );

  let body = data[ 1 ];
  return body.access_token;
}
function calcTopPhotos() {
  return Math.floor( MONTH_LIMIT/NUM_DAYS ) - 1;
}
function* getBestOfToday( max ) {
  let todayStart = moment().startOf( 'day' ).toDate().getTime();
  let todayEnd = moment().endOf( 'day' ).toDate().getTime();

  let top = yield db.find( 'posts', {
    source: 'instagram',
    timestamp: {
      $gte: todayStart,
      $lte: todayEnd,
    },
    clarifaiTags: null,
  } )
  .project( {
    _id: 0,
    id: 1,
    link: 1,
    'raw.likes.count': 1,
  } )
  .hint( 'Timestamp' )
  .sort( {
    'raw.likes.count': -1
  } )
  .limit( max )
  .toArray();

  top = _.map( top, d => ({
    id: d.id,
    link: d.link,
    likes: d.raw.likes.count,
    url: d.link+'media?size=l',
  }) );

  return top;
}
function* updateImage( id, tags ) {
  yield db.update( 'posts', {
    source: 'instagram',
    id: id,
  }, {
    clarifaiTags: tags,
  } );
}

// Module class declaration

// Module initialization (at first load)
// Promise.longStackTraces();

// Entry point
co( function* () {
  yield initDB();
  debug( 'Ready' );

  // Get request with some defaults
  let req = getRequest();


  // Get the number of daily requests todo
  let maxDailiyRequest = calcTopPhotos( MONTH_LIMIT );
  debug( 'Max dailiy request: %d', maxDailiyRequest );


  // Get token
  let token = yield getApplicationToken( req );
  debug( 'Token: %s', token );


  // Get todays top photos
  let bestOfToday = yield getBestOfToday( maxDailiyRequest );
  debug( 'Best of: ', bestOfToday );

  for( let image of bestOfToday ) {
    let id = image.id;
    let likes = image.likes;
    debug( 'Requesting tags for %s(%d)', id, likes );

    let tags = yield getTags( req, token, image );

    debug( 'Got tags', tags );
    yield updateImage( id, tags );
  }

  debug( 'Clarifai done' );
} )
.catch( function( err ) {
  debug( 'FUUUUU', err, err.stack );
} )
.then( db.close )
;

//  50 6F 77 65 72 65 64  62 79  56 6F 6C 6F 78