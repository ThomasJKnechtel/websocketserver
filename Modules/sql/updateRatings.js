const db = require('./sqlConnect')

async function updateRatings(challengerId, challengerRating, opponentId, opponentRating){
    try{
        const queryChallenger = `EXEC updateUserRating @rating=${challengerRating}, @user_id = '${challengerId}'`
        const queryOpponent = `EXEC updateUserRating @rating=${opponentRating}, @user_id = '${opponentId}'`
        await db.query(queryChallenger)
        await db.query(queryOpponent)
    }catch(err){
        console.log(err)
    }
    
}

module.exports = updateRatings