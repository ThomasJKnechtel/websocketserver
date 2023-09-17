const app = require( 'express')();
const http = require( 'http' ).createServer( app );
const { createClient }=require('redis');
require('dotenv').config()

const {puzzleGenQueue, jobsSocketMap} = require('./puzzleWorker')
const isAuthenticated = require('./authentication');
const initializeChallenge = require('./createChallenge');
const removeOldUserChallenges = require('./removeOldChallenges')
const db = require('./Modules/sql/sqlConnect')
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

subscribe.subscribe('challengesChannel', async (message, channel)=>{
  const challenges = await store.lRange('challenges', 0, -1)
  if(challenges){
    io.to('challengesRoom').emit('challenges', challenges)
  }else{
    io.to('challengesRoom').emit('challenges', [])
  }
  
})
io.on( 'connection', async function( socket ) {
    console.log('A user has connected')
    let user_id = null
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
      /**
       * If authenticated Initialize Challenge and Store User Challenge
       */
      socket.on('createChallenge', async (data)=>{
        let { token, challenge} = data
        const user = await isAuthenticated(token)
        const id = `${user.sub}_${Date.now()}`
        user_id = user.sub
        challenge = {...challenge, challenger : user.name, id, challengerId: user.sub}
        if(user){
          initializeChallenge(challenge, subscribe, publish, store, io, socket)
          removeOldUserChallenges(user_id, challenge, store, publish)
        }
      })
      socket.on('getChallenges',async ()=>{
        socket.join('challengesRoom')
        const challenges = await store.lRange('challenges', 0, -1)
        if(challenges) socket.emit('challenges', challenges)
      })
      socket.on('challengeAccepted', async (message)=>{
        let { token, challenge} = message
        const { id, opponentPuzzles: opponentPuzzleIds, challengerPuzzleIds,  timeControl} = challenge
        const user = await isAuthenticated(token)
        if(user){ 
          try{
            socket.join(`Game:${id}`)
            await publish.publish(`Game:${id}`, JSON.stringify({type:'ACCEPTED', data:{opponent:user.name, opponentPuzzleIds, opponentId:user.sub, id, challengerPuzzleIds, timeControl}}))
          }catch(err){
            console.log(err)
          }
         
        }

      })
      socket.on('ConnectToGame', async (message)=>{
        const {token} = message
        const user = await isAuthenticated(token)
        
        if(user){
          console.log(user.sub)
          const gameId = await store.hGet(`user:${user.sub}`, 'gameId')
          
          await socket.join(`Game:${gameId}`)
          if(gameId){
            
            await publish.publish(`Game:${gameId}`, JSON.stringify({type:'PLAYER_CONNECTED', data:{id:gameId, player_id: user.sub}}))
          }
          socket.on('ADD_MOVE', async (message)=>{
            const {move} = message
            const gameId = await store.hGet(`user:${user.sub}`, 'gameId')
            await publish.publish(`Game:${gameId}`, JSON.stringify({type:'ADD_MOVE', data:{id:gameId, player_id: user_id, move}}))
          })
        }
        
      })
      /**
       * On Disconnect remove outgoing user challenges
       */
      socket.on('disconnect', async ()=>{
        if(user_id){
          const challenge = await store.hGet(`user:${user_id}`, 'challenge')
          const gameId = await store.hGet(`user:${user_id}`, 'gameId')
          if(challenge){
            store.lRem('challenges', 0, challenge).then(result => console.log(result))
            store.hDel(`user:${user_id}`, 'challenges')
            publish.publish('challengesChannel', '')
          } 
          if(gameId){
            publish.publish(`Game:${gameId}`, JSON.stringify({type:'PLAYER_DISCONNECTED', data:{id:gameId, player_id: user_id}}))
          }
          
        }
      })
      
});
    

const PORT = 5050;


http.listen( PORT, async function() {
  console.log( 'listening on *:' + PORT );
  
});