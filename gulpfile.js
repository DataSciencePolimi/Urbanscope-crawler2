'use strict';
// Load system modules
const url = require( 'url' );
const path = require( 'path' );

// Load modules
const del = require( 'del' );
const gulp = require( 'gulp' );
const rename = require( 'gulp-rename' );
const run = require( 'gulp-run' );
const jsonEditor = require( 'gulp-json-editor' );
const runSequence = require( 'run-sequence' );

// Load my modules

// Constant declaration
const DEPLOY_DATABASE = 'urbanscopejs';
const DEPLOY_USERNAME = 'urbanscopejs';
const DEPLOY_PASSWORD = 'AQYeaRV3dh';
const DESTINATION = path.resolve( __dirname, 'deploy' );
const SOURCE = [
  '**',
  '!test/**',
  '!test/',
  '!deploy/**',
  '!deploy/',
  '!gulpfile.js',
  '!todo.md',
];

// Module variables declaration

// Task definitions
gulp.task( 'clean', function() {
  return del( [
    // 'deploy/**/*',
    'deploy/',
  ] );
} );

gulp.task( 'copy', function() {
  return gulp.src( SOURCE, {
    base: __dirname,
  } )
  .pipe( gulp.dest( DESTINATION ) );
} );

gulp.task( 'rename', function() {
  let sourceFileName = path.resolve( DESTINATION, 'crawler.js' );
  let destinationFileName = 'app.js';

  return gulp.src( sourceFileName )
  .pipe( rename( destinationFileName ) )
  .pipe( gulp.dest( DESTINATION ) );
} );

gulp.task( 'configure:redis', function() {
  let sourceFileName = path.resolve( DESTINATION, 'config', 'redis.json' );
  return gulp.src( sourceFileName )
  .pipe( jsonEditor( redis => {
    redis.password = DEPLOY_PASSWORD;
    return redis;
  } ) )
  .pipe( gulp.dest( DESTINATION+'/config/' ) );
} );
gulp.task( 'configure:mongo', function() {
  let sourceFileName = path.resolve( DESTINATION, 'config', 'mongo.json' );

  return gulp.src( sourceFileName )
  .pipe( jsonEditor( mongo => {
    mongo.url = url.format( {
      protocol: 'mongodb',
      slashes: true,
      auth: `${DEPLOY_USERNAME}:${DEPLOY_PASSWORD}`,
      hostname: 'localhost',
      port: 27017,
    } );
    mongo.name = DEPLOY_DATABASE;
    return mongo;
  } ) )
  .pipe( gulp.dest( DESTINATION+'/config/' ) );
} );
gulp.task( 'configure', [ 'configure:mongo', 'configure:redis' ] );

gulp.task( 'install-dep', function() {
  return run( 'npm install --production' ).exec();
} );


// Default task
gulp.task( 'default', function( callback ) {
  runSequence( 'clean', 'copy', [ 'rename', 'configure', 'install-dep' ], callback );
} );

//  50 6F 77 65 72 65 64  62 79  56 6F 6C 6F 78