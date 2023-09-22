const getPuzzlesByIds = require("../Modules/sql/getPuzzles")
const getUserById = require("../Modules/sql/getUser")
const { manageGameState } = require("../Modules/gameState/gameState")

async function acceptChallenge( opponentPuzzleIds, gameState, opponentId, opponentUsername, store){
    const challengerPuzzles = await getPuzzlesByIds(gameState.challenger.puzzleIds)
    const opponentPuzzles = await getPuzzlesByIds(opponentPuzzleIds)
    const challengerRating = (await getUserById(gameState.challenger.id)).rating
    const opponentRating = (await getUserById(opponentId)).rating
    const newGameState = manageGameState(
        {type: 'ACCEPTED', 
        data: {
                challengerPuzzles,
                opponentPuzzles,
                challengerRating,
                opponentRating,
                opponent: opponentUsername,
                opponentId
            }
        }, gameState)
    await store.set(`Game:${newGameState.state.id}`, JSON.stringify(newGameState))
    await store.hSet(`user:${opponentId}`,'gameId', gameState.state.id )
    await store.hSet(`user:${gameState.challenger.id}`,'gameId', gameState.state.id )
}

module.exports = acceptChallenge