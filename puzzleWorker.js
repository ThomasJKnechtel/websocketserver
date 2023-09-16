const { Queue, Worker } = require('bullmq')
const { generatePuzzles } = require('./generatePuzzles')

const jobsSocketMap = new Map()

const puzzleGenQueue = new Queue('puzzleGenQueue', { connection: {
    host: "localhost",
    port: 6379
  }})

const worker = new Worker('puzzleGenQueue', async job =>{

    return await generatePuzzles(job.data)
  }, 
  { connection: {
    host: "localhost",
    port: 6379
  }}
)

worker.on('completed', async (job, result)=>{
    const {socket, games, amount} = jobsSocketMap.get(job.id)
    jobsSocketMap.delete(job.id)
    const progress = amount - games.length
    console.log('length:',JSON.parse(result).length)
    if(JSON.parse(result).length>0){
      console.log('puzzles:', result)
      socket.emit('puzzles', result)
    }
    
    
    socket.emit('progress', JSON.stringify(progress*100/amount))
    if(game = games.pop()){
        newJob = await puzzleGenQueue.add('game', game)
        jobsSocketMap.set(newJob.id, {'socket':socket, 'games':games, 'amount':amount})
    }else{
      socket.emit('puzzlesCompleted')
    }
})
worker.on('failed', async (job, error)=>{
  const {socket, games, amount} = jobsSocketMap.get(job.id)
  jobsSocketMap.delete(job.id)
  const progress = amount - games.length

  socket.emit('progress', JSON.stringify(progress*100/amount))
  if(game = games.pop()){
      newJob = await puzzleGenQueue.add('game', game)
      jobsSocketMap.set(newJob.id, {'socket':socket, 'games':games, 'amount':amount})
  }else{
    socket.emit('puzzlesCompleted')
  }
})

module.exports = {worker, jobsSocketMap, puzzleGenQueue}