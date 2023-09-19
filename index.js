const app = require( 'express')();
const http = require( 'http' ).createServer( app );
const { createClient }=require('redis');
require('dotenv').config()

const {puzzleGenQueue, jobsSocketMap} = require('./puzzleWorker')
const isAuthenticated = require('./authentication');
const addChallenge = require('./Controllers/createChallenge');
const removeOldUserChallenges = require('./Controllers/removeOldChallenges')
const db = require('./Modules/sql/sqlConnect');
const initializeGame = require('./Controllers/initializeGameState');
const {manageGameState} = require('./gameState');
const acceptChallenge = require('./Controllers/acceptChallenge');
const removeAcceptedChallenge = require('./Controllers/removeAcceptedChallenge');

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
subscribe.subscribe(`Games`, async (id, channel)=>{
  const gameState = JSON.parse(await store.get(`Game:${id}`))
  const {  challenger, opponent, state, challengerPuzzleState, opponentPuzzleState, challengerRating, opponentRating, timeControl, opponentState, challengerState, numberOfPuzzles, opponentPuzzlesCompleted, challengerPuzzlesCompleted, opponentRatingChange, challengerRatingChange, startTime, finishTime } = gameState
  let message = {id, challenger, opponent, state, challengerRating, opponentRating, timeControl, opponentState, challengerState, numberOfPuzzles, opponentPuzzlesCompleted, challengerPuzzlesCompleted, opponentRatingChange, challengerRatingChange, startTime, finishTime }
  if(state === "IN_PROGRESS" || state === "FINISHED"){
    message.challengerPuzzleState = {fen: challengerPuzzleState.fen, playerTurn: challengerPuzzleState.playerTurn, state: challengerPuzzleState.state}
    message.opponentPuzzleState = {fen: opponentPuzzleState.fen, playerTurn: opponentPuzzleState.playerTurn, state: opponentPuzzleState.state}
  }
  console.log(message)
  io.to(`Game:${id}`).emit('game_message', message)
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
        const { token, challenge} = data
        const user = await isAuthenticated(token)
        const id = `${user.sub}_${Date.now()}`
        user_id = user.sub
        if(user){
          await addChallenge({...challenge, challenger: user.name, id},  store)
          await removeOldUserChallenges(user_id, {...challenge, challenger: user.name, id}, store)
          await initializeGame({...challenge, challenger : user.name, id, challengerId: user.sub}, store, id)
          await store.hSet(`user:${user_id}`, 'challenge', JSON.stringify({...challenge, challenger: user.name, id}) )
          publish.publish('challengesChannel','')
          socket.join(`Game:${id}`)
        }
      })
      socket.on('getChallenges',async ()=>{
        socket.join('challengesRoom')
        const challenges = await store.lRange('challenges', 0, -1)
        if(challenges) socket.emit('challenges', challenges)
      })
      socket.on('challengeAccepted', async (message)=>{
        let { token, challenge} = message
        const { id, opponentPuzzles: opponentPuzzleIds} = challenge
        const user = await isAuthenticated(token)
        if(user){ 
          try{
            user_id = user.sub
            socket.join(`Game:${id}`)
            const gameState = JSON.parse(await store.get(`Game:${id}`))
            if(opponentPuzzleIds.length === gameState.challengerPuzzleIds.length){
              await acceptChallenge(opponentPuzzleIds, gameState, user.sub, store)
              await removeAcceptedChallenge(store, gameState.challengerPuzzleIds, gameState.timeControl, gameState.challenger, gameState.id)
              publish.publish('Games', id)
              publish.publish('challengesChannel', '')
            }
           
          }catch(err){
            console.log(err)
          }
         
        }

      })
      socket.on('ConnectToGame', async (message)=>{
        const {token} = message
        const user = await isAuthenticated(token)
        if(user){
          const gameId = await store.hGet(`user:${user.sub}`, 'gameId')
          user_id = user.sub
          if(gameId){
            await socket.join(`Game:${gameId}`)
            const gameState = JSON.parse(await store.get(`Game:${gameId}`))
            const newGameState = manageGameState({type: 'PLAYER_CONNECTED', data:{player_id: user.sub}}, gameState)
            await store.set(`Game:${gameId}`, JSON.stringify(newGameState))
            publish.publish('Games', gameId)
          }
          socket.on('ADD_MOVE', async (message)=>{
            const {move} = message
            const gameId = await store.hGet(`user:${user.sub}`, 'gameId')
            const gameState = JSON.parse(await store.get(`Game:${gameId}`))
            console.log(move)
            const newGameState = manageGameState({type: 'ADD_MOVE', data:{player_id: user.sub, move}}, gameState)
            
            await store.set(`Game:${gameId}`, JSON.stringify(newGameState))
            publish.publish('Games', gameId)
          })
          socket.on('READY', async ()=>{
            const gameId = await store.hGet(`user:${user.sub}`, 'gameId')
            const gameState = JSON.parse(await store.get(`Game:${gameId}`))
            const newGameState = manageGameState({type: 'PLAYER_READY', data:{player_id: user.sub}}, gameState)
            await store.set(`Game:${gameId}`, JSON.stringify(newGameState))
            publish.publish('Games', gameId)
          })
          socket.on('RESIGNED', async ()=>{
            const gameId = await store.hGet(`user:${user.sub}`, 'gameId')
            const gameState = JSON.parse(await store.get(`Game:${gameId}`))
            const newGameState = manageGameState({type: 'RESIGN', data:{player_id: user.sub}}, gameState)
            await store.set(`Game:${gameId}`, JSON.stringify(newGameState))
            publish.publish('Games', gameId)
          })
          socket.on('TIMES_UP', async ()=>{
            const gameId = await store.hGet(`user:${user.sub}`, 'gameId')
            const gameState = JSON.parse(await store.get(`Game:${gameId}`))
            const newGameState = manageGameState({type: 'TIMES_UP', data:{}}, gameState)
            await store.set(`Game:${gameId}`, JSON.stringify(newGameState))
            publish.publish('Games', gameId)
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
            const gameState = JSON.parse(await store.get(`Game:${gameId}`))
            const newGameState = manageGameState({type: 'PLAYER_DISCONNECTED', data:{player_id: user_id}}, gameState)
            await store.set(`Game:${gameId}`, JSON.stringify(newGameState))
            publish.publish('Games', gameId)
          }
          
        }
      })
      
});


    

const PORT = 5050;


http.listen( PORT, async function() {
  console.log( 'listening on *:' + PORT );
  
});