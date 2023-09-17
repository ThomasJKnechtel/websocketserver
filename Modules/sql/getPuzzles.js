const db = require('./sqlConnect')

async function getPuzzlesByIds(puzzleIds){
    const input = JSON.stringify([...puzzleIds, null])
    const query = `EXEC GetPuzzlesById @idList = ${input}`
    console.log(query)
    const result = await db.query(query)
    return result.recordsets[0]
}

module.exports = getPuzzlesByIds