const app = require( 'express')();
const http = require( 'http' ).createServer( app );
const { createClient }=require('redis');
require('dotenv').config()

const {puzzleGenQueue, jobsSocketMap} = require('./puzzleWorker')
const isAuthenticated = require('./authentication');


const store = createClient();
const subscribe = createClient()
const publish = createClient()
store.connect()
subscribe.connect()
publish.connect()

const io = require( 'socket.io' )( http,
  {cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST']
  }}
);

subscribe.subscribe('challengesChannel', (message, channel)=>{
  io.to('challengesRoom').emit('challenges', message)
})
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
        const { token, challenge} = data
        const user = await isAuthenticated(token)
        if(user){
          challenge.challenger = user.name
          try{
            await store.rPush('challenges', JSON.stringify(challenge))
            const challenges = await store.lRange('challenges',0, -1)
            publish.publish('challengesChannel', JSON.stringify(challenges))
          }catch(err){
            console.log(err)
          }
          
          
        }
      })
      socket.on('getChallenges', ()=>{
        socket.join('challengesRoom')
        
      })
      
});
    

const PORT = 5050;


http.listen( PORT, async function() {
  console.log( 'listening on *:' + PORT );
  
});