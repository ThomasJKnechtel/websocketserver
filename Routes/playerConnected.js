const addMove = require("../Controllers/puzzle_duel/addMove")
const isAuthenticated = require("../Controllers/authentication")
const playerReady = require("../Controllers/puzzle_duel/playerReady")
const playerResigned = require("../Controllers/puzzle_duel/playerResigned")
const timesUp = require("../Controllers/puzzle_duel/timesUp")
const connectPlayer = require("../Controllers/puzzle_duel/connectPlayer")

async function playerConnected(message, socket){
    const {token} = message
    const user = await isAuthenticated(token)
    if(user){
      const gameId = await connectPlayer(message, user.sub, socket)
      socket.on('ADD_MOVE', async (message)=>{
        await addMove(message, user.sub)
      })
      socket.on('READY', async ()=>{
        await playerReady(null, user.sub)
      })
      socket.on('RESIGNED', async ()=>{
        await playerResigned(null, user.sub)
      })
      socket.on('TIMES_UP', async ()=>{
       await timesUp(user.sub)
      })
      return user.sub
    }
}

module.exports = playerConnected