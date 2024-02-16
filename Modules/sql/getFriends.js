const db = require("./sqlConnect")

async function getFriendsById(userId){
    const query = `EXEC GetFriendsById @userId='${userId}'`
    const result = await db.query(query)
    return result?.recordset[0]?.friends
}
module.exports=getFriendsById