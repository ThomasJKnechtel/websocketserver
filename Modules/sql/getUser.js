const db = require('./sqlConnect')

async function getUserById(userId){
    
    const query = `EXEC getUser @user_id = '${userId}'`
    const result = await db.query(query)
    return result.recordset[0]
}

module.exports = getUserById