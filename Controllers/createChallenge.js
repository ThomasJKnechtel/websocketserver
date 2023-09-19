
/**
 * Allows challenge to be accepted and viewed by subscribers
 * @param {id, challenger, selectedPuzzles, timeControl} challenge 
 * @param {redisClient} subscribe 
 * @param {redisClient} publish 
 * @param {redisClient} store 
 * @param {SocketIO} io 
 */
async function addChallenge(challenge, store){
        try{
            await store.rPush('challenges', JSON.stringify(challenge))
            await store.lRange('challenges',0, -1)
            
          }catch(err){
            console.log(err)
          }
}

module.exports = addChallenge