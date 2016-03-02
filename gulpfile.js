'use strict';
// Load system modules
const path = require( 'path' );

// Load modules
const gulp = require( 'gulp' );
const rename = require( 'gulp-rename' );
const del = require( 'del' );


// Load my modules

// Constant declaration
const DESTINATION = path.resolve( __dirname, 'deploy' );
const SOURCE = [
  '**',
  '!gulpfile.js',
  '!todo.md',
];

// Module variables declaration

// Task definitions
gulp.task( 'clean', function() {
  return del( [
    'deploy/**/*',
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

// Default task

gulp.task( 'default', [ 'clean', 'copy', 'rename' ] );

//  50 6F 77 65 72 65 64  62 79  56 6F 6C 6F 78