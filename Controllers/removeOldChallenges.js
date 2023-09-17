async function removeOldUserChallenges(user_id, challenge, store){
    try{
        const oldChallenges = await store.hGet(`user:${user_id}`, 'challenge')
        console.log('oldChallenges: %s',oldChallenges)
        store.hSet(`user:${user_id}`, 'challenge', JSON.stringify(challenge))
        if(oldChallenges){
            await store.lRem('challenges', 0, oldChallenges)
        } 
    }catch(err){
        console.log(err)
    }
   
}
module.exports = removeOldUserChallenges