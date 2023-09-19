const getPuzzlesByIds = require("../Modules/sql/getPuzzles")
const getUserById = require("../Modules/sql/getUser")
const { manageGameState } = require("../gameState")

async function acceptChallenge( opponentPuzzleIds, gameState, opponentId,store){
    const challengerPuzzles = await getPuzzlesByIds(gameState.challengerPuzzleIds)
    const opponentPuzzles = await getPuzzlesByIds(opponentPuzzleIds)
    const challengerRating = (await getUserById(gameState.challengerId)).rating
    const opponent = await getUserById(opponentId)
    const newGameState = manageGameState({type: 'ACCEPTED', data: {challengerPuzzles, opponentPuzzles, challengerRating, opponentRating: opponent.rating, opponent: opponent.user_name ,opponentId}}, gameState)
    await store.set(`Game:${newGameState.id}`, JSON.stringify(newGameState))
    await store.hSet(`user:${opponentId}`,'gameId', gameState.id )
    await store.hSet(`user:${gameState.challengerId}`,'gameId', gameState.id )
}

module.exports = acceptChallenge