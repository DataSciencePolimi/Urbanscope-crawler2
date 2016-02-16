'use strict';
// Load system modules

// Load modules
let _ = require( 'lodash' );
let turf = require( 'turf' );
let debug = require( 'debug' )( 'UrbanScope:grid' );

// Load my modules
let file = require( '../utils/file' );

// Constant declaration
const GRID_FILE = 'grid.json';
const AREA_FILE = 'milan_province.json';

// Module variables declaration

// Module functions declaration
function* loadGridPoints( fileName ) {
  debug( 'Load grid points' );
  return yield file.load( 'data', fileName );
}
function* saveGridPoints( fileName, data ) {
  debug( 'Saving grid' );

  yield file.save( 'data', fileName, data );
}

function* generateGridPoints( width, featureArea ) {
  let name = featureArea.properties.name;
  debug( 'Get grid points from %s', name );

  let bbox = turf.extent( featureArea );
  debug( 'BBOX', bbox );

  // Convert meters to km
  width = width/1000;
  let hexgrid = turf.hexGrid( bbox, width, 'kilometers' );
  debug( 'Generate %d hex for the grid', hexgrid.features.length );

  let points = _.map( hexgrid.features, hex => {
    let center = turf.centroid( hex );
    return center;
  } );
  let fcRawPoints = turf.featurecollection( points );
  debug( 'Generated %d raw points', points.length );


  debug( 'Filtering out points' );
  let fcArea = turf.featurecollection( [ featureArea ] );
  let fcPoints = turf.within( fcRawPoints, fcArea );
  debug( 'Got %d points inside the area', fcPoints.features.length );

  return fcPoints;
}
function* getGridPoints( width ) {
  let gridPoints = [];

  try {
    gridPoints = yield loadGridPoints( GRID_FILE );

  } catch( err ) {
    debug( 'No grid present, generating one' );

    debug( 'Loading area' );
    const area = yield file.load( 'config', AREA_FILE );

    gridPoints = yield generateGridPoints( width, area );
    saveGridPoints( GRID_FILE, gridPoints )
  }

  return gridPoints;
}
function* index( type, idx ) {
  let fileName = 'grid-index-'+type+'.json';

  // Set index
  if( arguments.length===2 ) {
    debug( 'Save index to %d', idx );

    yield file.save( 'data', fileName, idx );
    return idx;

  // Get index
  } else {
    debug( 'Load index' );

    return yield file.load( 'data', fileName );
  }
}

// Module class declaration

// Module initialization (at first load)

// Module exports
module.exports.generate = generateGridPoints;
module.exports.load = loadGridPoints;
module.exports.save = saveGridPoints;
module.exports.get = getGridPoints;
module.exports.index = index;

//  50 6F 77 65 72 65 64  62 79  56 6F 6C 6F 78