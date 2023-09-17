const manageGameState = require('./manageGameState')

/**
 * Allows challenge to be accepted and viewed by subscribers
 * @param {id, challenger, selectedPuzzles, timeControl} challenge 
 * @param {redisClient} subscribe 
 * @param {redisClient} publish 
 * @param {redisClient} store 
 * @param {SocketIO} io 
 */
async function initializeChallenge(challenge, subscribe, publish, store, io, socket){
        try{
            const {id, challenger, challengerId, challengerPuzzleIds, timeControl } = challenge
           
            await store.rPush('challenges', JSON.stringify(challenge))
            const challenges = await store.lRange('challenges',0, -1)
            socket.join(`Game:${id}`)
            await subscribe.subscribe(`Game:${id}`, async (message, channel)=>{
              await manageGameState(JSON.parse(message), store, publish)
              const data = await store.hGetAll(`Game:${id}`)
              io.to(`Game:${id}`).emit('game_message', JSON.stringify(data))
            })
            publish.publish('challengesChannel', JSON.stringify(challenges))
            publish.publish(`Game:${id}`, JSON.stringify({type: 'INITIALIZE', data: {id, challenger, challengerId, challengerPuzzleIds, timeControl}}))
          }catch(err){
            console.log(err)
          }
          
    
}

module.exports = initializeChallenge