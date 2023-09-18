const {puzzleStartState, playMove, addMoveToGameState} = require('./Modules/puzzleState/setPuzzleState')
const {Chess} = require('chess.js')
const gameStartState = {
    state: 'LOOKING_FOR_OPPONENT',
    winner: '',
    timeControl:' ',
    startTime:' ',
    id: ' ',
    numberOfPuzzles: 0,

    challenger: ' ',
    challengerId : ' ',
    challengerPuzzleIds: '[]',
    challengerPuzzles: '[]',
    challengerPuzzleStats: '[]',
    challengerPuzzleState: '{}',
    challengerPuzzlesCompleted: 0,
    challengerState: "",
    challengerRating:null,

    opponent: ' ',
    opponentId:' ',
    opponentPuzzleIds: '[]',
    opponentPuzzles: '[]',
    opponentPuzzleStats: '[]',
    opponentPuzzlState:'{}',
    opponentPuzzlesCompleted: 0,
    opponentState:"",
    challengerRating:null
}
function manageGameState(message, gameState){
    const {type, data} = message
    if(type==="INITIALIZE"){
        const {id, challenger, challengerId, timeControl, challengerPuzzleIds} = data
        return {...gameStartState, id, challenger, challengerId, timeControl, challengerPuzzleIds, numberOfPuzzles: challengerPuzzleIds.length}
    }else if(type === "ACCEPTED"){
        const { opponentPuzzles, challengerPuzzles, challengerRating, opponentRating, opponent} = data
        if(opponentPuzzles.length === challengerPuzzles.length){
            const challengerPuzzle = challengerPuzzles.pop()
            const opponentPuzzleState = puzzleStartState(challengerPuzzle.fen, challengerPuzzle.continuation, challengerPuzzle.turn)
            const opponentPuzzle = opponentPuzzles.pop()
            const challengerPuzzleState = puzzleStartState(opponentPuzzle.fen, opponentPuzzle.continuation, opponentPuzzle.turn)
            return {...gameState, opponentPuzzles: [...opponentPuzzles], challengerPuzzles:[...challengerPuzzles], opponentPuzzleState, challengerPuzzleState, state:"WAITING", challengerRating, opponentRating, opponent }
        }
        
        return gameState
    }else if(type === "PLAYER_CONNECTED"){
        const { player_id } = data
        if(player_id === gameState.challengerId){
            return { ...gameState, challengerState: "CONNECTED"}
        }else{
            return { ...gameState, opponentState: "CONNECTED"}
        }
    }else if(type === "PLAYER_DISCONNECTED"){
        const { player_id } = data
        if(player_id === gameState.challengerId){
            return { ...gameState, challengerState: "DISCONNECTED"}
        }else{
            return { ...gameState, opponentState: "DISCONNECTED"}
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
    }else if(type === "PLAYER_READY"){
        const { player_id } = data
        let newGameState = {...gameState}
        if(player_id === gameState.challengerId){
           newGameState.challengerState = "READY"
        }else{
            newGameState.opponentState =  "READY"
        }
        if(newGameState.challengerState === "READY" && newGameState.opponentState === "READY"){
            newGameState.state = "IN_PROGRESS"
        }
        return newGameState
    }
}
module.exports = {manageGameState, gameStartState}