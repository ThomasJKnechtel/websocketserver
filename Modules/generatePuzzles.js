const {spawn} = require('child_process');
const path = require('path')
require('dotenv').config()
async function generatePuzzles(gamePgns){
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn( path.join(process.env.WEBSITE_PATH,"/dist/PuzzleGenerator"), [JSON.stringify([gamePgns]), process.env.STOCKFISH_PATH]);
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
module.exports = {generatePuzzles}
