const { store } = require("../connectToReddis")

async function addChallenge(challenge){
        try{
            await store.rPush('challenges', JSON.stringify(challenge))
            await store.lRange('challenges',0, -1)
            
          }catch(err){
            console.log(err)
          }
}

module.exports = addChallenge