var app = require( 'express')();
var http = require( 'http' ).createServer( app );
const path = require('path')
const { Queue, Worker } = require('bullmq')
const {spawn} = require('child_process');
const { default: getPuzzle } = require('./getPuzzle');
require('dotenv').config()

const jobsSocketMap = new Map()
var io = require( 'socket.io' )( http,{cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST']
  }}  );

const PORT = 5050;

const puzzleGenQueue = new Queue('puzzleGenQueue', { connection: {
    host: "localhost",
    port: 6379
  }})
  
const worker = new Worker('puzzleGenQueue', async job =>{

   return await generatePuzzles(job.data)
}, { connection: {
    host: "localhost",
    port: 6379
  }})
http.listen( PORT, function() {
console.log( 'listening on *:' + PORT );
});
io.on( 'connection', function( socket ) {
    console.log( 'a user has connected!' );
    socket.on('gamesPgns', async function(message){
        const games = JSON.parse(message)
        const job =  await puzzleGenQueue.add('game',  games.pop())
        jobsSocketMap.set(job.id,{'socket':socket, 'games':games, 'amount':games.length} )
    })
    // socket.on('playPuzzle', async (puzzle_id)=>{
    //   console.log(puzzle_id)
    //   if(puzzle_id){
    //     const puzzle = await getPuzzle(puzzle_id)
    //     socket.emit('puzzle', puzzle)
    //   }

      
    // })
    
    socket.on('play3', (puzzles)=>{
        setTimeout(()=>{
          socket.emit('timesUp')
        }, 3000*60)
      })
      socket.on('play5', (puzzles)=>{
        setTimeout(()=>{
          socket.emit('timesUp')
        }, 5000*60)
      })
    
    });
    
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
// // worker.on('error', async (job, error)=>{
// //     console.log(error)
// //     jobsSocketMap.delete(job.id)
// //     const {socket, games, amount} = jobsSocketMap.get(job.id)
// //     jobsSocketMap.delete(job.id)
// //     const progress = amount - games.length

// //     socket.emit('progress', JSON.stringify(progress*100/amount))
// //     if(game = games.pop()){
// //         newJob = await puzzleGenQueue.add('game', game)
// //         jobsSocketMap.set(newJob.id, {'socket':socket, 'games':games, 'amount':amount})
// //     }else{
// //       socket.emit('puzzlesCompleted')
// //     }
    
// // }
// )
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
async function generatePuzzles(gamePgns){
  
  
    
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python', [path.join(process.env.WEBSITE_PATH,"/Modules/PuzzleGenerator/PuzzleGenerator.py"), JSON.stringify([gamePgns])]);
      let result = null;
  
      pythonProcess.stdout.on('data', (data) => {
        result = data.toString();
      });
  
      pythonProcess.stderr.on('data', (data) => {
        console.error(`Error executing Python script: ${data.toString()}`);
        reject(data.toString());
      });
  
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          resolve(result);
        } else {
          console.log(`Python script exited with code ${code}`);
          reject(`Python script exited with code ${code}`);
        }
      });
    });
  }
  