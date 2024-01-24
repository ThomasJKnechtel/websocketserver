const db = require("./sqlConnect");

async function updateUserStats(user_id, userStats){
    const query = `EXEC updateUserStats @user_id = '${user_id}', @userStats='${userStats}'`
    await db.query(query)
}

module.exports = updateUserStats