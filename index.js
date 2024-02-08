const app = require( 'express')();
const http = require( 'http' ).createServer( app );
require('dotenv').config()

const createChallenge = require('./Routes/createChallenge')
const {store, subscribe} = require('./connectToReddis');
const playerConnected = require('./Routes/playerConnected');
const userDisconnected = require('./Controllers/userDisconnected');
const gameUpdated = require('./Controllers/puzzle_duel/gameUpdated');
const generatePuzzles = require('./Controllers/generatePuzzles');
const acceptChallenge = require('./Controllers/acceptChallenge');
const challengeAccepted = require('./Routes/acceptChallenge');


const io = require( 'socket.io' )( http,
  {cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }}
);
/**
 * On new challenge send challenges to users looking for games
 */
subscribe.subscribe('challengesChannel', async (message, channel)=>{
  const challenges = await store.lRange('challenges', 0, -1)
  if(challenges){
    io.to('challengesRoom').emit('challenges', challenges)
  }else{
    io.to('challengesRoom').emit('challenges', [])
  }
  
})
/**
 * On game update send message to players and if game over save result
 */
subscribe.subscribe(`Games`, async (id, channel)=>{
  await gameUpdated(id, io)
})

io.on( 'connection', async function( socket ) {
    console.log('A user has connected')
    let user_id = null
    
    socket.on('gamesPgns', async function(message){
       await generatePuzzles(message, socket)
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
      /**
       * If authenticated Initialize Challenge and Store User Challenge
       */
      socket.on('createChallenge', async (data)=>createChallenge(data, socket))
      
      socket.on('getChallenges',async ()=>{
        socket.join('challengesRoom')
        const challenges = await store.lRange('challenges', 0, -1)
        if(challenges) socket.emit('challenges', challenges)
      })
      socket.on('challengeAccepted', async (message)=>{
        user_id = await challengeAccepted(message, socket)
      })
      socket.on('ConnectToGame', async (message)=>{
        user_id = await playerConnected(message, socket)
        
      })
      /**
       * On Disconnect remove outgoing user challenges and notify opponent that player disconnected
       */
      socket.on('disconnect', async ()=>{
        await userDisconnected(user_id)
      })
      
});


    

const PORT = 7000;


http.listen( PORT, async function() {
  console.log( 'listening on *:' + PORT );
  
});
