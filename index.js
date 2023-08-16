var app = require( 'express')();
var http = require( 'http' ).createServer( app );
const { Queue, Worker } = require('bullmq')

var io = require( 'socket.io' )( http,{cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST']
  }}  );

const PORT = 5050;

const puzzleGenQueue = new Queue('puzzleGenQueue', { connection: {
    host: "localhost",
    port: 6379
  }})
  
const worker = new Worker('puzzleGenQueue', async job =>{
    console.log(job.data)
}, { connection: {
    host: "localhost",
    port: 6379
  }})
http.listen( PORT, function() {
console.log( 'listening on *:' + PORT );
});
io.on( 'connection', function( socket ) {
    console.log( 'a user has connected!' );
    socket.on('gamesPgns', function(message){
        console.log(message)
        puzzleGenQueue.add('game', message)
    })
    socket.emit('message', 'test')
    });
worker.on('completed', ()=>{
    console.log('complete')
})