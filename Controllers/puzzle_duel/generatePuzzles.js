const { puzzleGenQueue, jobsSocketMap } = require("../../puzzleWorker")

async function generatePuzzles(message, socket){
    const games = JSON.parse(message)
    const time = Date.now()
    const randomNum =  Math.floor(Math.random() * 10000)
    const requestId = `${time}_${randomNum}`
    socket.join(requestId)
    const jobData = {requestId, games, currentGame: 0}
    await puzzleGenQueue.add(`${requestId}_0`,  jobData)
}

module.exports = generatePuzzles