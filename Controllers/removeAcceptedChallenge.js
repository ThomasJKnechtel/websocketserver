

async function removeAcceptedChallenge(store, challengerPuzzleIds, timeControl, challenger, id ){
    console.log({challengerPuzzleIds, timeControl, challenger,id })
    await store.lRem('challenges', 0, JSON.stringify({challengerPuzzleIds, timeControl, challenger,id }))
}
module.exports = removeAcceptedChallenge