
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
            await store.rPush('challenges', JSON.stringify(challenge))
            const challenges = await store.lRange('challenges',0, -1)
            socket.join(`Game_${challenge.id}`)
            
            subscribe.subscribe(`Game_${challenge.id}`, (message, channel)=>{
              console.log('ran')
              challengeAccepted(JSON.parse(message), io, store, publish)
            })
            publish.publish('challengesChannel', JSON.stringify(challenges))
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
    const {id, challenger, challengerPuzzles: selectedPuzzles, timeControl} = challenge
    console.log(JSON.stringify({selectedPuzzles, timeControl, challenger,id }))
    await store.lRem('challenges', 0, JSON.stringify({selectedPuzzles, timeControl, challenger,id }))
    io.to(`Game_${id}`).emit('game_message', challenge )
    publish.publish('challengesChannel', 'test')
  }catch(err){
    console.log(err)
  }
  
}

module.exports = initializeChallenge