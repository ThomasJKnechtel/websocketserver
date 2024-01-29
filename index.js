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
const {manageGameState} = require('./Modules/gameState/gameState');
const acceptChallenge = require('./Controllers/acceptChallenge');
const removeAcceptedChallenge = require('./Controllers/removeAcceptedChallenge');
const updateRatings = require('./Modules/sql/updateRatings');
const updatePuzzleRatings = require('./Modules/sql/updatePuzzleRatings');
const EloChange = require('./utils/eloCalculator');

const store = createClient();
const subscribe = createClient()
const publish = createClient()
store.connect()
subscribe.connect()
publish.connect()


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
  const {state, challenger, opponent} = JSON.parse(await store.get(`Game:${id}`))
  if(state.state === "FINISHED" && !state.saved){
    const {A, B} = EloChange(challenger.rating, opponent.rating, 40, (challenger.state==="WON")?"A":(challenger.state==="DRAW")?"DRAW":"B")
    updateRatings(challenger.id, challenger.rating+A, opponent.opponentId, opponent.rating+B)
    updatePuzzleRatings(opponent.puzzleStats, challenger.puzzleStats)
    state.saved = true
    challenger.ratingChange = A
    opponent.ratingChange = B
    store.set(`Game:${id}`, JSON.stringify({state, challenger, opponent}))
  }
  if(state.state === "WAITING"){
    challenger.puzzleState.fen = ""
    opponent.puzzleState.fen = ""
  } 
  let message = {state, challenger: {...challenger, puzzleState:{...challenger.puzzleState, continuation: null, nextMove: null}}, opponent: {...opponent, puzzleState:{ ...opponent.puzzleState, continuation: null, nextMove: null}} }
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
          await addChallenge({...challenge, challenger: user.username, id},  store)
          await removeOldUserChallenges(user_id, {...challenge, challenger: user.username, id}, store)
          await initializeGame({...challenge, challenger : user.username, id, challengerId: user.sub}, store, id)
          await store.hSet(`user:${user_id}`, 'challenge', JSON.stringify({...challenge, challenger: user.username, id}) )
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
            if(opponentPuzzleIds.length === gameState.state.numberOfPuzzles){
              await acceptChallenge(opponentPuzzleIds, gameState, user.sub, user.username, store)
              await removeAcceptedChallenge(store, gameState.challenger.puzzleIds, gameState.state.timeControl, gameState.challenger.username, gameState.id)
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
       * On Disconnect remove outgoing user challenges and notify opponent that player disconnected
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
