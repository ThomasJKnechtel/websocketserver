const acceptChallenge = require("../Controllers/puzzle_duel/acceptChallenge")
const isAuthenticated = require("../Controllers/authentication")
const removeAcceptedChallenge = require("../Controllers/puzzle_duel/removeAcceptedChallenge")
const { store, publish } = require("../connectToReddis")


async function challengeAccepted(message, socket){
    let { token, challenge} = message
    const { id, opponentPuzzles: opponentPuzzleIds} = challenge
    const user = await isAuthenticated(token)
    let user_id = user.sub
    if(user){ 
        try{
            
            socket.join(`Game:${id}`)
            const gameState = JSON.parse(await store.get(`Game:${id}`))
            if(opponentPuzzleIds.length === gameState.state.numberOfPuzzles){
              await acceptChallenge(opponentPuzzleIds, gameState, user_id, user.username, store)
              await removeAcceptedChallenge(store, gameState.challenger.puzzleIds, gameState.state.timeControl, gameState.challenger.username, gameState.id)
              publish.publish('Games', id)
              publish.publish('challengesChannel', '')
            }
           
        }catch(err){
            console.log(err)
        }
    }
    return user_id
}
module.exports = challengeAccepted