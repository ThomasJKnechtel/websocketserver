const { Queue, Worker } = require('bullmq')
const {io} = require('./server')
const {generatePuzzles} = require('./Modules/generatePuzzles')

const puzzleGenQueue = new Queue('puzzleGenQueue', { connection: {
    host: "localhost",
    port: 6379
  }})

const worker = new Worker('puzzleGenQueue', async job =>{
    const {currentGame, games} = job.data
    return await generatePuzzles(games[currentGame])
  }, 
  { connection: {
    host: "localhost",
    port: 6379
  }}
)

worker.on('completed', async (job, result)=>{
  if(job){
    let {requestId, currentGame, games} = job.data
    const puzzles = JSON.parse(result)
    currentGame += 1
    const progress = currentGame/games.length
    io.to(requestId).emit('puzzlesGenerated', {puzzles, progress })
    if(progress<1){
      puzzleGenQueue.add(`${requestId}_${currentGame}`, {requestId, currentGame, games})
    }
  }
    
})
worker.on('failed', async (job, error)=>{
  if(job){
    console.log(error)
    let {requestId, currentGame, games} = job.data
    currentGame += 1
    const progress = currentGame/games.length
    io.to(requestId).emit('puzzlesGenerated', {puzzles:[], progress })

  }
})

module.exports = {worker, puzzleGenQueue}