const EloChange = require('../../utils/eloCalculator')
const db = require('./sqlConnect')

async function updatePuzzleRatings(opponentPuzzleStats, challengerPuzzleStats){
    try{
        const puzzleStats = opponentPuzzleStats.concat(challengerPuzzleStats)
        const puzzleUpdates = puzzleStats.map((stat)=>{
            return {
                puzzle_id: stat.puzzleId,
                rating: stat.rating,
                passed: (stat.result==="COMPLETED")?(1):(0)
            }
        })
        const query = `EXEC UpdatePlayedPuzzles @PuzzleUpdates='${JSON.stringify(puzzleUpdates)}'`
        console.log(query)
        await db.query(query)
    }catch(err){
        console.log(err)
    }
    
}

module.exports = updatePuzzleRatings