const { puzzleGenQueue, jobsSocketMap } = require("../../puzzleWorker")

async function generatePuzzles(message, socket){
    const games = JSON.parse(message)
    const job =  await puzzleGenQueue.add('game',  games.pop())
    jobsSocketMap.set(job.id,{'socket':socket, 'games':games, 'amount':games.length} )
}

module.exports = generatePuzzles