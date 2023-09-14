var app = require( 'express')();
var http = require( 'http' ).createServer( app );
const jwt=require('jsonwebtoken')
require('dotenv').config()

const {puzzleGenQueue, jobsSocketMap} = require('./puzzleWorker')
const isAuthenticated = require('./authentication')

var io = require( 'socket.io' )( http,
  {cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST']
  }}
);
io.on( 'connection', function( socket ) {
    console.log( 'a user has connected!' );
    socket.on('gamesPgns', async function(message){
        const games = JSON.parse(message)
        const job =  await puzzleGenQueue.add('game',  games.pop())
        jobsSocketMap.set(job.id,{'socket':socket, 'games':games, 'amount':games.length} )
    })
    
    socket.on('play3', ()=>{
        setTimeout(()=>{
          socket.emit('timesUp')
        }, 3000*60)
      })
      socket.on('play5', ()=>{
        setTimeout(()=>{
          socket.emit('timesUp')
        }, 5000*60)
      })
      socket.on('createChallenge', async (data)=>{
        const { token} = data
        console.log(token)
 
        const result = await isAuthenticated(token)
        console.log(result)
      })
    
    });
    

const PORT = 5050;


http.listen( PORT, function() {
  console.log( 'listening on *:' + PORT );
});