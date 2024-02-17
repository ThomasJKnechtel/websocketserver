const {spawn} = require('child_process');
const path = require('path')
require('dotenv').config()
async function generatePuzzles(gamePgns){
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn( path.join(process.env.WEBSITE_PATH,"/dist/PuzzleGenerator.exe"), [JSON.stringify([gamePgns]), "C:/Users/Thomas/OneDrive/JS Files/stockfish-9-win/Windows/stockfish_9_x64.exe"]);
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
