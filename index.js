var app = require( 'express')();
var http = require( 'http' ).createServer( app );
const path = require('path')
const { Queue, Worker } = require('bullmq')
const {spawn} = require('child_process')
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
        
        const job =  await puzzleGenQueue.add('game',  message)
        console.log(job.id)
        jobsSocketMap.set(job.id, socket)
    })
   
    });
worker.on('completed', (job, result)=>{
    const socket = jobsSocketMap.get(job.id)
    jobsSocketMap.delete(job.id)
    socket.emit('puzzles', result)
})
worker.on('error', (job, error)=>{
    jobsSocketMap.delete(job.id)
    console.log(error)
}
)
worker.on('failed', (job, error)=>{
    console.log(error)
})
async function generatePuzzles(gamePgns){
  
    console.log('test');
    
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python', [path.join(process.env.WEBSITE_PATH,"/Modules/PuzzleGenerator/PuzzleGenerator.py"),gamePgns]);
      let result = null;
  
      pythonProcess.stdout.on('data', (data) => {
        result = data.toString();
        console.log(result);
      });
  
      pythonProcess.stderr.on('data', (data) => {
        console.error(`Error executing Python script: ${data.toString()}`);
        reject(data.toString());
      });
  
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          console.log(result);
          resolve(result);
        } else {
          console.log(`Python script exited with code ${code}`);
          reject(`Python script exited with code ${code}`);
        }
      });
    });
  }
  