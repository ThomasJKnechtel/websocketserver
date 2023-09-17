const {puzzleStartState, playMove, addMoveToGameState} = require('./Modules/puzzleState/setPuzzleState')
const {Chess} = require('chess.js')
const gameStartState = {
    state: 'LOOKING_FOR_OPPONENT',
    winner: '',
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
    challengerPuzzlesCompleted: 0,
    challengerState: "",

    opponent: ' ',
    opponentId:' ',
    opponentPuzzleIds: '[]',
    opponentPuzzles: '[]',
    opponentPuzzleStats: '[]',
    opponentPuzzlState:'{}',
    opponentConnection: "CONNECTED",
    opponentPuzzlesCompleted: 0,
    opponentState:""
}
function manageGameState(message, gameState){
    const {type, data} = message
    if(type==="INITIALIZE"){
        const {id, challenger, challengerId, timeControl, challengerPuzzleIds} = data
        return {...gameStartState, id, challenger, challengerId, timeControl, challengerPuzzleIds}
    }else if(type === "ACCEPTED"){
        const { opponentPuzzles, challengerPuzzles} = data
        if(opponentPuzzles.length === challengerPuzzles.length){
            const challengerPuzzle = challengerPuzzles.pop()
            const opponentPuzzleState = puzzleStartState(challengerPuzzle.fen, challengerPuzzle.continuation, challengerPuzzle.turn)
            const opponentPuzzle = opponentPuzzles.pop()
            const challengerPuzzleState = puzzleStartState(opponentPuzzle.fen, opponentPuzzle.continuation, opponentPuzzle.turn)
            return {...gameState, opponentPuzzles: [...opponentPuzzles], challengerPuzzles:[...challengerPuzzles], opponentPuzzleState, challengerPuzzleState, state:"IN_PROGRESS" }
        }
        
        return gameState
    }else if(type === "PLAYER_CONNECTED"){
        const { player_id } = data
        if(player_id === gameState.challengerId){
            return { ...gameState, 'challengerConnection': "CONNECTED"}
        }else{
            return { ...gameState, 'opponentConnection': "CONNECTED"}
        }
    }else if(type === "PLAYER_DISCONNECTED"){
        const { player_id } = data
        if(player_id === gameState.challengerId){
            return { ...gameState, 'challengerConnection': "DISCONNECTED"}
        }else{
            return { ...gameState, 'opponentConnection': "DISCONNECTED"}
        }
    }else if(type === "ADD_MOVE"){
        const {player_id, move} = data
        if(gameState.challengerId === player_id){
            const puzzleState = {...gameState.challengerPuzzleState}
            const game = new Chess(puzzleState.fen)
            game.move(move)
            addMoveToGameState(puzzleState, move, game.fen())
            if(puzzleState.state === "OPPONENTS_TURN"){
                game.move(gameState.nextMove)
                playMove(gameState, game.fen())
            }
            if(puzzleState.state === "FAILED" || puzzleState.state === "COMPLETED"){
                const opponentPuzzles = [...gameState.opponentPuzzles]
                if(puzzleState.state === "COMPLETED")gameState.challengerPuzzlesCompleted += 1
                if(opponentPuzzles.length>0){
                    const {fen, continuation, turn} = opponentPuzzles.pop()
                    const newPuzzleState = puzzleStartState(fen, continuation, turn)
                    const challengerPuzzleStats = {startTime: puzzleState.start_time, finish_time: Date.now(), result: puzzleState.state }
                    return {...gameState, challengerPuzzleState: newPuzzleState, opponentPuzzles, challengerPuzzleStats }
                }
                return {...gameState, challengerState:"FINISHED", challengerPuzzleState: puzzleState}
            }
            return {...gameState, challengerPuzzleState: puzzleState}
        }else{
            const puzzleState = {...gameState.opponentPuzzleState}
            const game = new Chess(puzzleState.fen)
            game.move(move)
            addMoveToGameState(puzzleState, move, game.fen())
            if(puzzleState.state === "OPPONENTS_TURN"){
                game.move(gameState.nextMove)
                playMove(gameState, game.fen())
            }
            if(puzzleState.state === "FAILED" || puzzleState.state === "COMPLETED"){
                if(puzzleState.state === "COMPLETED")gameState.challengerPuzzlesCompleted += 1
                const challengerPuzzles = [...gameState.challengerPuzzles]
                if(opponentPuzzles.length>0){
                    const {fen, continuation, turn} = challengerPuzzles.pop()
                    const newPuzzleState = puzzleStartState(fen, continuation, turn)
                    const opponentPuzzleStats = {startTime: puzzleState.start_time, finish_time: Date.now(), result: puzzleState.state }
                    return {...gameState, opponentPuzzleState: newPuzzleState, challengerPuzzles, opponentPuzzleStats }
                }
                return {...gameState, challengerState: "FINISHED", opponentPuzzlState: puzzleState}
            }
            return {...gameState, opponentPuzzleState: puzzleState}
        }
    }
}
module.exports = {manageGameState, gameStartState}