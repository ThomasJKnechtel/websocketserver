const jwt = require('jsonwebtoken')
require('dotenv').config()
async function isAuthenticated(token){
    try{
        return await jwt.verify(token, process.env.SECRET)
    }catch(err){
        console.log(err)
        return false
    }
   
}

module.exports = isAuthenticated