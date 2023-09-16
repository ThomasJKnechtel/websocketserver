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
              console.log('data: %s',JSON.stringify(data))
              io.to(`Game:${id}`).emit('game_message', JSON.stringify(data))
            })
            publish.publish('challengesChannel', JSON.stringify(challenges))
            publish.publish(`Game:${id}`, JSON.stringify({type: 'INITIALIZE', data: {id, challenger, challengerId, challengerPuzzleIds, timeControl}}))
          }catch(err){
            console.log(err)
          }
          
    
}
/**
 * When challenge is accepted notify challenger and acceptee and update challenges
 * @param {The Accepted Challenge} challenge 
 * @param {SocketIO} io 
 * @param {RedisClient} store 
 * @param {RedisClient} publish 
 */
async function challengeAccepted(challenge, io, store, publish){
  try{
    
    io.to(`Game_${id}`).emit('game_message', challenge )
    publish.publish('challengesChannel', 'test')
  }catch(err){
    console.log(err)
  }
  
}

module.exports = initializeChallenge