const { store, publish } = require("../../connectToReddis")
const { manageGameState } = require("../../Models/gameState")

async function playerReady(message, user_id){
    const gameId = await store.hGet(`user:${user_id}`, 'gameId')
    const gameState = JSON.parse(await store.get(`Game:${gameId}`))
    const newGameState = manageGameState({type: 'PLAYER_READY', data:{player_id: user_id}}, gameState)
    await store.set(`Game:${gameId}`, JSON.stringify(newGameState))
    publish.publish('Games', gameId)
}

module.exports = playerReady