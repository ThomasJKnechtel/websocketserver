const app = require( 'express')();
const http = require( 'http' ).createServer( app );
const cors = require('cors')

app.use(cors())
const io = require( 'socket.io' )( http,
  {cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }}
);

module.exports = {app, http, io}