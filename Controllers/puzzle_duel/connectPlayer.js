const { store, publish } = require("../../connectToReddis")
const { manageGameState } = require("../../Models/gameState")

async function connectPlayer(message, user_id, socket){
    const gameId = await store.hGet(`user:${user_id}`, 'gameId')
      
    if(gameId){
      await socket.join(`Game:${gameId}`)
      const gameState = JSON.parse(await store.get(`Game:${gameId}`))
      const newGameState = manageGameState({type: 'PLAYER_CONNECTED', data:{player_id: user_id}}, gameState)
      await store.set(`Game:${gameId}`, JSON.stringify(newGameState))
      publish.publish('Games', gameId)
    }
    return gameId
}
module.exports = connectPlayer