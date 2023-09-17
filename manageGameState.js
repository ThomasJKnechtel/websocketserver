const getPuzzlesByIds = require('./Modules/sql/getPuzzles')
const {puzzleStartState, playMove, addMoveToGameState} = require('./Modules/puzzleState/setPuzzleState')
const {Chess} = require('chess.js')
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
        timeControl:' ',
        startTime:' ',
        id: ' ',

        challenger: ' ',
        challengerId : ' ',
        challengerPuzzleIds: '[]',
        challengerPuzzles: '[]',
        challengerPuzzleStats: '[]',
        challengerPuzzleState: '{}',
        challengerConnection: "CONNECTED",

        opponent: ' ',
        opponentId:' ',
        opponentPuzzleIds: '[]',
        opponentPuzzles: '[]',
        opponentPuzzleStats: '[]',
        opponentPuzzlState:'{}',
        opponentConnection: "CONNECTED",

    }
    try{
        const { type, data } = message
        if(type === "INITIALIZE"){
            //Stores game
            const {id, challenger, challengerId, timeControl, challengerPuzzleIds : challengerPuzzleIds} = data
            gameStartState = { ...gameStartState, id, challenger, challengerId, challengerPuzzleIds: JSON.stringify(challengerPuzzleIds) }
            await store.hSet(`Game:${id}`, [...Object.entries(gameStartState).flat()] )
     
        }
        else if(type === "ACCEPTED"){
            //Updates Game and removes challenge 
            const {id, opponentPuzzleIds, opponent, opponentId, timeControl} = data
            const {challengerPuzzleIds, challenger, challengerId} = await store.hGetAll(`Game:${id}`)
            if(JSON.parse(challengerPuzzleIds)?.length === opponentPuzzleIds.length){
                
                await store.lRem('challenges', 0, JSON.stringify({challengerPuzzleIds:JSON.parse(challengerPuzzleIds), timeControl, challenger,id, challengerId }))
                publish.publish('challengesChannel', '')
                
                const opponentPuzzles = await getPuzzlesByIds(opponentPuzzleIds)
                const challengerPuzzles = await getPuzzlesByIds(JSON.parse(challengerPuzzleIds))
                const challengersFirstPuzzle = opponentPuzzles.pop()
                const opponentsFirstPuzzle = challengerPuzzles.pop()
                const opponentPuzzleState = JSON.stringify(puzzleStartState(opponentsFirstPuzzle.fen, JSON.parse(opponentsFirstPuzzle.continuation), opponentsFirstPuzzle.turn))
                const challengerPuzzleState = JSON.stringify(puzzleStartState(challengersFirstPuzzle.fen, JSON.parse(challengersFirstPuzzle.continuation), challengersFirstPuzzle.turn))
                
                const acceptedObject = { opponentPuzzleIds:JSON.stringify(opponentPuzzleIds), opponent, opponentId, opponentPuzzles: JSON.stringify(opponentPuzzles), challengerPuzzles: JSON.stringify(challengerPuzzles), state: 'IN_PROGRESS', opponentPuzzleState, challengerPuzzleState}
                
                await store.hSet(`Game:${id}`, [...Object.entries(acceptedObject).flat()])
                
                store.hSet(`user:${opponentId}`,'gameId', id )
                store.hSet(`user:${challengerId}`,'gameId', id )

            }
        }else if(type === "PLAYER_CONNECTED"){
            const {id, player_id} = data
            const challengerId = store.hGet(`Game:${id}`, 'challengerId')
            if(challengerId === player_id){
                store.hSet(`Game:${id}`, 'challengerConnection', "CONNECTED")
            }else{
                store.hSet(`Game:${id}`, 'opponentConnection', "CONNECTED")
            }
           
        }else if(type === "PLAYER_DISCONNECTED"){
            const {id, player_id} = data
            const challengerId = store.hGet(`Game:${id}`, 'challengerId')
            if(challengerId===player_id){
                store.hSet(`Game:${id}`, 'challengerConnection', "DISCONNECTED")
            }else{
                store.hSet(`Game:${id}`, 'opponentConnection', "DISCONNECTED")
            }
        }else if(type === "ADD_MOVE"){
            const {id, player_id, move} = data
            const challengerId = await store.hGet(`Game:${id}`, 'challengerId')
            if(challengerId===player_id){
                const gameState = JSON.parse(await store.hGet(`Game:${id}`, 'challengerPuzzleState'))
                console.log(gameState)
                const game = new Chess(gameState.fen)
                game.move(move)
                addMoveToGameState(gameState, move, game.fen())
                console.log(gameState)
                if(gameState.nextMove){
                    game.move(gameState.nextMove)
                    playMove(gameState, game.fen())
                }
                store.hSet(`Game:${id}`, 'challengerPuzzleState', JSON.stringify(gameState))
            }else{
                const gameState = JSON.parse(await store.hGet(`Game:${id}`, 'opponentPuzzleState'))
                const game = new Chess(gameState.fen)
                game.move(move)
                addMoveToGameState(gameState, move, game.fen())
                console.log(gameState)
                if(gameState.nextMove){
                    game.move(gameState.nextMove)
                    playMove(gameState, game.fen())
                }
                store.hSet(`Game:${id}`, 'opponentPuzzleState', JSON.stringify(gameState))
               
            } 
        }
    }catch(err){
        console.log(err)
    }
    

}

module.exports = manageGameState