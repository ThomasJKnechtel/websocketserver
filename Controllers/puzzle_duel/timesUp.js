const { store, publish } = require("../../connectToReddis")
const { manageGameState } = require("../../Models/gameState")

async function timesUp(message, user_id){
    const gameId = await store.hGet(`user:${user_id}`, 'gameId')
    const gameState = JSON.parse(await store.get(`Game:${gameId}`))
    const newGameState = manageGameState({type: 'TIMES_UP', data:{}}, gameState)
    await store.set(`Game:${gameId}`, JSON.stringify(newGameState))
    publish.publish('Games', gameId)
}

module.exports = timesUp