const db = require('./sqlConnect')

async function getPuzzlesByIds(puzzleIds){
    puzzleIds.push(null)
    const query = `EXEC GetPuzzlesById @idList = ${JSON.stringify(puzzleIds)}`
    console.log(query)
    const result = await db.query(query)
    return result.recordsets[0]
}

module.exports = getPuzzlesByIds