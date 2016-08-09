'use strict';
// Load system modules
const stream = require( 'stream' );

// Load modules
const debug = require( 'debug' )( 'UrbanScope:utils:stream-filter' );

// Load my modules
const db = require( 'db-utils' );

// Constant declaration

// Module variables declaration

// Module functions declaration

// Module class declaration
class FilterKnownPosts extends stream.Transform {
  constructor( postsCollectionName ) {
    super( { objectMode: true } );
    this.posts = db.get( postsCollectionName );
  }

  isAlreadyPresent( id, source ) {
    return this.posts
    .find( {
      id: id,
      source: source,
    } )
    .project( { _id: 1 } ) // just check for existence...
    .limit( 1 )
    .toArray()
    .then( docs => {
      if( docs && docs.length === 1 ) {
        return true;
      } else {
        return false;
      }
    } );
  }

  _transform( post, enc, cb ) {
    return this
    .isAlreadyPresent( post.id, post.source )
    .then( isPresent => {
      if( isPresent ) {
        debug( 'Skip: [%s]%s', post.source, post.id );
      } else {
        this.push( post ); // Pass the data
      }
      return cb();
    } );
  }
}


// Module initialization (at first load)

// Module exports
module.exports = FilterKnownPosts;

//  50 6F 77 65 72 65 64  62 79  56 6F 6C 6F 78