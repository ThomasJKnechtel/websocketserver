
const {spawn} = require('child_process');
const path = require('path')

const { app } = require('@azure/functions');

app.http('generatePuzzles', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
       
      const gamePGN = await request.text()
      const puzzles = await generatePuzzles([gamePGN], __dirname)
      return { body: puzzles};
    },
});
async function generatePuzzles(gamePgns, dirPath){

    return new Promise((resolve, reject) => {
      const process = spawn(path.join(dirPath, '/PuzzleGenerator'), [JSON.stringify(gamePgns), path.join(dirPath, "/stockfish")]);
      let result = null;
  
      process.stdout.on('data', (data) => {
        result = data.toString();
      });
  
      process.stderr.on('data', (data) => {
        console.error(`Error executing Python script: ${data.toString()}`);
        reject(data.toString());
      });
  
      process.on('close', (code) => {
        if (code === 0) {
          resolve(result);
        } else {
          console.log(`Python script exited with code ${code}`);
          reject(`Python script exited with code ${code}`);
        }
      });
    });
  }
