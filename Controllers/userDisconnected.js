const { store, publish } = require("../connectToReddis")
const { manageGameState } = require("../Models/gameState")

async function userDisconnected(user_id){
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
}

module.exports = userDisconnected