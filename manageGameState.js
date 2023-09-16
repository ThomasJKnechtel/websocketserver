const getPuzzlesByIds = require('./Modules/sql/getPuzzles')
/**
 * 
 * @param {*} message 
 * @param {createClient} store 
 * @param {*} publish 
 * @param {*} subscribe 
 */
async function manageGameState(message, store, publish){
    let gameStartState = {
        state: 'LOOKING_FOR_OPPONENT',
        timeControl:'',
        startTime:'',
        id: '',

        challenger: '',
        challengerId : '',
        challengerPuzzleIds: '',
        challengerPuzzles: '',
        opponentPuzzleStats: '',

        opponent: '',
        opponentId:'',
        opponentPuzzleIds: '',
        opponentPuzzles: '',
        opponentPuzzleStats: ''

    }
    try{
        const { type, data } = message
        if(type === "INITIALIZE"){
            const {id, challenger, challengerId, timeControl, challengerPuzzleIds : challengerPuzzleIds} = data
            gameStartState = { ...gameStartState, id, challenger, challengerId, challengerPuzzleIds: JSON.stringify(challengerPuzzleIds) }
            console.log(gameStartState)
            store.hSet(`Game:${id}`, [...Object.entries(gameStartState).flat()] )
        }
        else if(type === "ACCEPTED"){
        
            const {id, opponentPuzzleIds, opponent, opponentId, timeControl} = data
            const {challengerPuzzleIds, challenger, challengerId} = await store.hGetAll(`Game:${id}`)
    
            if(JSON.parse(challengerPuzzleIds)?.length === opponentPuzzleIds.length){
                
                await store.lRem('challenges', 0, JSON.stringify({challengerPuzzleIds:JSON.parse(challengerPuzzleIds), timeControl, challenger,id, challengerId }))
                publish.publish('challengesChannel', '')
                
                const opponentPuzzles = await getPuzzlesByIds(opponentPuzzleIds)
                console.log(opponentPuzzles)
                const acceptedObject = { opponentPuzzleIds:JSON.stringify(opponentPuzzleIds), opponent, opponentId, opponentPuzzles, state: 'IN_PROGRESS'}
                store.hSet(`Game:${id}`, [...Object.entries(acceptedObject).flat()])
                store.hSet(`user:${opponentId}`,'gameId', id )
                store.hSet(`user:${challengerId}`,'gameId', id )

                
                
            }
        }
    }catch(err){
        console.log(err)
    }
    

}

module.exports = manageGameState