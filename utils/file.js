'use strict';
// Load system modules
let path = require( 'path' );
let fs = require( 'fs' );

// Load modules
let debug = require( 'debug' )( 'UrbanScope:utils:file' );

// Load my modules

// Constant declaration


// Module variables declaration

// Module functions declaration
function getLocation( folder, fileName ) {
  let fullPath = path.resolve( __dirname, '..', folder, fileName );
  return fullPath;
}
function* loadJSON( folder, fileName ) {
  debug( 'Loading "%s" in "%s"', fileName, folder );
  let fullPath = getLocation( folder, fileName );
  let gridPoints = require( fullPath );

  return gridPoints;
}
function* saveJSON( folder, fileName, data ) {
  debug( 'Saving "%s" in "%s"', fileName, folder );
  let fullPath = getLocation( folder, fileName );

  let json = JSON.stringify( data, null, 2 );
  fs.writeFileSync( fullPath, json, 'utf8' );
}


// Module class declaration

// Module initialization (at first load)

// Module exports
module.exports.load = loadJSON;
module.exports.save = saveJSON;

//  50 6F 77 65 72 65 64  62 79  56 6F 6C 6F 78