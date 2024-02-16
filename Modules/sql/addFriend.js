const db = require("./sqlConnect")

async function addFriends(userId, userFriends, friendId, friendsFriends ){
    const query = `EXEC AddFriends @userId='${userId}', @userFriends='${userFriends}', @friendId='${friendId}', @friendsFriends='${friendsFriends}'`
    db.query(query)
}

module.exports=addFriends