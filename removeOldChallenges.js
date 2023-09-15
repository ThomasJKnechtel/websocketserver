async function removeOldUserChallenges(user_id, challenge, store, publish){
    try{
        const oldChallenges = await store.hGet(`user:${user_id}`, 'challenge')
        store.hSet(`user:${user_id}`, 'challenge', JSON.stringify(challenge))
        if(oldChallenges){
            await store.lRem('challenges', 0, oldChallenges)
            publish.publish('challengesChannel', '')
        } 
    }catch(err){
        console.log(err)
    }
   
}
module.exports = removeOldUserChallenges