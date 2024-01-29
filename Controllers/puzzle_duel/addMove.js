const { publish, store } = require("../../connectToReddis")
const { manageGameState } = require("../../Models/gameState")

async function addMove(message, user_id){
    const {move} = message
    const gameId = await store.hGet(`user:${user_id}`, 'gameId')
    const gameState = JSON.parse(await store.get(`Game:${gameId}`))
    const newGameState = manageGameState({type: 'ADD_MOVE', data:{player_id: user_id, move}}, gameState)
    await store.set(`Game:${gameId}`, JSON.stringify(newGameState))
    publish.publish('Games', gameId)
}

module.exports = addMove