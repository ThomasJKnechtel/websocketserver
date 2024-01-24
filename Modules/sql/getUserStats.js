const db = require("./sqlConnect");

async function getUserStats(user_id){
    const query = `EXEC getUserStats @user_id = '${user_id}'`
    const results = await db.query(query)
    return results.recordset[0]
}

module.exports = getUserStats