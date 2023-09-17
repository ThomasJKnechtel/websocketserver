const getPuzzlesByIds = require("../Modules/sql/getPuzzles")
const { manageGameState } = require("../gameState")

async function acceptChallenge( opponentPuzzleIds, gameState, opponentId,store){
    const challengerPuzzles = await getPuzzlesByIds(gameState.challengerPuzzleIds)
    const opponentPuzzles = await getPuzzlesByIds(opponentPuzzleIds)
    const newGameState = manageGameState({type: 'ACCEPTED', data: {challengerPuzzles, opponentPuzzles}}, gameState)
    await store.set(`Game:${newGameState.id}`, JSON.stringify(newGameState))
    await store.hSet(`user:${opponentId}`,'gameId', gameState.id )
    await store.hSet(`user:${gameState.challengerId}`,'gameId', gameState.id )
}

module.exports = acceptChallenge