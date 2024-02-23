const app = require( 'express')();
const http = require( 'http' ).createServer( app );
const cors = require('cors')
const {Server} = require( 'socket.io' )


const io = new Server(http, {
  cors: {
    origin: '*'
  }
});


module.exports = {app, http, io}
