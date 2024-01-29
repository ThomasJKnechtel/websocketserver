const isAuthenticated = require('../Controllers/authentication')
const removeOldUserChallenges = require('../Controllers/removeOldChallenges')
const initializeGame = require('../Controllers/initializeGameState')
const {store, publish} = require('../connectToReddis')
const addChallenge = require('../Controllers/addChallenge')

/**
 * If player is authenticated add challenge to queue, initialize game and remove user's old challenges
 * @param {{token, challenge}} message 
 */
async function createChallenge(message, socket){
    const { token, challenge} = message
    const user = await isAuthenticated(token)
    const id = `${user.sub}_${Date.now()}`
    const user_id = user.sub
    if(user){
        await addChallenge({...challenge, challenger: user.username, id})
        await removeOldUserChallenges(user_id, {...challenge, challenger: user.username, id}, store)
        await initializeGame({...challenge, challenger : user.username, id, challengerId: user.sub}, store, id)
        await store.hSet(`user:${user_id}`, 'challenge', JSON.stringify({...challenge, challenger: user.username, id}) )
        publish.publish('challengesChannel','')
        socket.join(`Game:${id}`)
    }
    return user_id
}

module.exports = createChallenge