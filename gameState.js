const {puzzleStartState, playMove, addMoveToGameState} = require('./Modules/puzzleState/setPuzzleState')
const {Chess} = require('chess.js')
const EloChange = require('./utils/eloCalculator')
const gameStartState = {
    state: 'LOOKING_FOR_OPPONENT',
    winner: '',
    timeControl:' ',
    startTime:null,
    finishTime: null,
    id: ' ',
    numberOfPuzzles: 0,

    challenger: ' ',
    challengerId : ' ',
    challengerPuzzleIds: [],
    challengerPuzzles: [],
    challengerPuzzleStats: [],
    challengerPuzzleState: '{}',
    challengerPuzzlesCompleted: 0,
    challengerState: "CONNECTED",
    challengerRating:null,
    challengerPuzzlesCompleted: 0,
    challengerPuzzlesAttempted: 0,
    challengerRatingChange: 0,

    opponent: ' ',
    opponentId:' ',
    opponentPuzzleIds: '[]',
    opponentPuzzles: '[]',
    opponentPuzzleStats: '[]',
    opponentPuzzlState:'{}',
    opponentPuzzlesCompleted: 0,
    opponentPuzzlesAttempted: 0,
    opponentState:"CONNECTED",
    opponentRating:null,
    opponentRatingChange:0
}
function manageGameState(message, gameState){
    const {type, data} = message
    if(gameState.state === "IN_PROGRESS"){
        if(gameState.finishTime < Date.now()){
            return updateGameState(gameState, true)
        }
    }
    if(type==="INITIALIZE"){
        const {id, challenger, challengerId, timeControl, challengerPuzzleIds} = data
        return {...gameStartState, id, challenger, challengerId, timeControl, challengerPuzzleIds, numberOfPuzzles: challengerPuzzleIds.length}
    }else if(type === "ACCEPTED"){
        const { opponentPuzzles, challengerPuzzles, challengerRating, opponentRating, opponent, opponentId} = data
        if(opponentPuzzles.length === challengerPuzzles.length){
            const challengerPuzzle = challengerPuzzles.pop()
            const opponentPuzzleState = puzzleStartState(challengerPuzzle.fen, challengerPuzzle.continuation, challengerPuzzle.turn)
            const opponentPuzzle = opponentPuzzles.pop()
            const challengerPuzzleState = puzzleStartState(opponentPuzzle.fen, opponentPuzzle.continuation, opponentPuzzle.turn)
            return {...gameState, opponentPuzzles: [...opponentPuzzles], challengerPuzzles:[...challengerPuzzles], opponentPuzzleState, challengerPuzzleState, state:"WAITING", challengerRating, opponentRating, opponent, opponentId }
        }
        
        return gameState
    }else if(type === "PLAYER_CONNECTED"){
        const { player_id } = data
        if(gameState.state !== "FINISHED"){
            if(player_id === gameState.challengerId && gameState.challengerState === "DISCONNECTED"){
                return { ...gameState, challengerState: "CONNECTED"}
            }else if(player_id === gameState.opponentId && gameState.opponentState === "DISCONNECTED"){
                return { ...gameState, opponentState: "CONNECTED"}
            }
        }
        return gameState
    }else if(type === "PLAYER_DISCONNECTED"){
        const { player_id } = data
        if(gameState.state !== "FINISHED"){
            if(player_id === gameState.challengerId &&( gameState.challengerState === "READY" || gameState.challengerState === "CONNECTED" )){
                return { ...gameState, challengerState: "DISCONNECTED"}
            }else if(player_id === gameState.opponentId &&( gameState.opponentState === "READY" || gameState.opponentState === "CONNECTED" )){
                return { ...gameState, opponentState: "DISCONNECTED"}
            }
        }
        return gameState
    }else if(type === "ADD_MOVE"){
        const {player_id, move} = data
        if(gameState.state !== "FINISHED"){
            if(gameState.challengerId === player_id && gameState.challengerState === "CONNECTED"){
                const puzzleState = {...gameState.challengerPuzzleState}
                const game = new Chess(puzzleState.fen)
                game.move(move)
                addMoveToGameState(puzzleState, move, game.fen())
                if(puzzleState.state === "OPPONENTS_TURN"){
                    game.move(puzzleState.nextMove)
                    playMove(puzzleState, game.fen())
                }
                if(puzzleState.state === "FAILED" || puzzleState.state === "COMPLETED"){
                    const opponentPuzzles = [...gameState.opponentPuzzles]
                    if(puzzleState.state === "COMPLETED")gameState.challengerPuzzlesCompleted += 1
                    gameState.challengerPuzzlesAttempted += 1
                    gameState = updateGameState(gameState)
                    if(gameState.challengerState === "CONNECTED"){
                        
                        const {fen, continuation, turn} = opponentPuzzles.pop()
                        const newPuzzleState = puzzleStartState(fen, continuation, turn)
                        const challengerPuzzleStats = {startTime: puzzleState.start_time, finish_time: Date.now(), result: puzzleState.state }
                        return {...gameState, challengerPuzzleState: newPuzzleState, opponentPuzzles, challengerPuzzleStats }
                    }
                    return {...gameState, challengerPuzzleState: puzzleState}
                }
                return {...gameState, challengerPuzzleState: puzzleState}
            }else if(gameState.opponentId === player_id && gameState.opponentState === "CONNECTED"){
                const puzzleState = {...gameState.opponentPuzzleState}
                const game = new Chess(puzzleState.fen)
                game.move(move)
                addMoveToGameState(puzzleState, move, game.fen())
                if(puzzleState.state === "OPPONENTS_TURN"){
                    game.move(puzzleState.nextMove)
                    playMove(puzzleState, game.fen())
                }
                if(puzzleState.state === "FAILED" || puzzleState.state === "COMPLETED"){
                    if(puzzleState.state === "COMPLETED")gameState.opponentPuzzlesCompleted += 1
                    gameState.opponentPuzzlesAttempted += 1
                    const challengerPuzzles = [...gameState.challengerPuzzles]
                    gameState = updateGameState(gameState)
                    if(gameState.opponentState === "CONNECTED"){
                        const {fen, continuation, turn} = challengerPuzzles.pop()
                        const newPuzzleState = puzzleStartState(fen, continuation, turn)
                        const opponentPuzzleStats = {startTime: puzzleState.start_time, finish_time: Date.now(), result: puzzleState.state }
                        return {...gameState, opponentPuzzleState: newPuzzleState, challengerPuzzles, opponentPuzzleStats }
                    }
                    return {...gameState, opponentPuzzlState: puzzleState}
                }
                return {...gameState, opponentPuzzleState: puzzleState}
            }
        }
        return gameState
    }else if(type === "PLAYER_READY"){
        const { player_id } = data
        let newGameState = {...gameState}
        if(gameState.state === "WAITING"){
            if(player_id === gameState.challengerId){
                if(gameState.challengerState === "CONNECTED"){
                    newGameState.challengerState = "READY"
                }
            }else{
                if(gameState.opponentState === "CONNECTED"){
                     newGameState.opponentState =  "READY"
                }
            }
            if(newGameState.challengerState === "READY" && newGameState.opponentState === "READY"){
                newGameState.state = "IN_PROGRESS"
                newGameState.challengerState = "CONNECTED"
                newGameState.opponentState = "CONNECTED"
                newGameState.startTime = Date.now()
                newGameState.finishTime = (newGameState.timeControl==="3Minute")?(Date.now()+3*60*1000):(Date.now()+3*60*1000)
            }
        }
        return newGameState
    }else if(type === "RESIGN"){
        const { player_id } = data
        let newGameState = {...gameState}
        if(gameState.state === "IN_PROGRESS"){
            if(player_id === gameState.challengerId){
                newGameState.challengerState = "RESIGNED"
                newGameState.opponentState =  "WON"
                const {playerA, playerB} = EloChange(gameState.challengerRating, gameState.opponentRating, 40, 'B')
                newGameState = {...newGameState, challengerState: "RESIGNED", opponentState: "WON", challengerRatingChange: playerA, opponentRatingChange: playerB}
            }else{
                const {playerA, playerB} = EloChange(gameState.challengerRating, gameState.opponentRating, 40, 'A')
                newGameState = {...newGameState, challengerState: "WON", opponentState: "RESIGNED", challengerRatingChange: playerA, opponentRatingChange: playerB}
            }
            newGameState.state = "FINISHED"
        }
        return newGameState
    }
}
function updateGameState(gameState, timesUp){
    const {challengerPuzzlesCompleted, challengerPuzzlesAttempted, opponentPuzzlesCompleted, opponentPuzzlesAttempted, numberOfPuzzles} = gameState
    const challenerMaxScore = challengerPuzzlesCompleted + (numberOfPuzzles-challengerPuzzlesAttempted)
    const opponentMaxScore = opponentPuzzlesCompleted + (numberOfPuzzles-opponentPuzzlesAttempted)
    console.log({challenerMaxScore, opponentMaxScore, challengerPuzzlesAttempted, opponentPuzzlesAttempted})
    if(timesUp){
        if(challengerPuzzlesCompleted > opponentPuzzlesCompleted){
            const {playerA, playerB} = EloChange(gameState.challengerRating, gameState.opponentRating, 40, 'A')
            return {...gameState, state :"FINISHED", challengerState : "WON", opponentState: "LOST", challengerRatingChange: playerA, opponentRatingChange: playerB}
        }else if(challengerPuzzlesCompleted < opponentPuzzlesCompleted){
            const {playerA, playerB} = EloChange(gameState.challengerRating, gameState.opponentRating, 40, 'B')
            return {...gameState, state :"FINISHED", challengerState : "LOST", opponentState: "WON", challengerRatingChange: playerA, opponentRatingChange: playerB}
        }else{
            const {playerA, playerB} = EloChange(gameState.challengerRating, gameState.opponentRating, 40, 'DRAW')
            return {...gameState, state :"FINISHED", challengerState : "DRAW", opponentState: "DRAW", challengerRatingChange: playerA, opponentRatingChange: playerB}
        }
       
    }else if(challengerPuzzlesCompleted > opponentMaxScore || challengerPuzzlesCompleted === numberOfPuzzles){
        const {playerA, playerB} = EloChange(gameState.challengerRating, gameState.opponentRating, 40, 'A')
        return {...gameState, state :"FINISHED", challengerState : "WON", opponentState: "LOST", challengerRatingChange: playerA, opponentRatingChange: playerB}
    }else if(opponentPuzzlesCompleted > challenerMaxScore || opponentPuzzlesCompleted === numberOfPuzzles){
        const {playerA, playerB} = EloChange(gameState.challengerRating, gameState.opponentRating, 40, 'B')
        return {...gameState, state :"FINISHED", challengerState : "LOST", opponentState: "WON", challengerRatingChange: playerA, opponentRatingChange: playerB}
    }else if(challengerPuzzlesAttempted === numberOfPuzzles && opponentPuzzlesAttempted !== numberOfPuzzles){
        return {...gameState, challengerState: "FINISHED"}
    }else if(opponentPuzzlesAttempted === numberOfPuzzles && challengerPuzzlesAttempted !== numberOfPuzzles){
        return {...gameState, opponentState: "FINISHED"}
    }else if(opponentPuzzlesAttempted === numberOfPuzzles && challengerPuzzlesAttempted === numberOfPuzzles && opponentPuzzlesCompleted=== challengerPuzzlesCompleted){
        const {playerA, playerB} = EloChange(gameState.challengerRating, gameState.opponentRating, 40, 'draw')
        return {...gameState, state :"FINISHED", challengerState : "DRAW", opponentState: "DRAW", challengerRatingChange: playerA, opponentRatingChange: playerB}
        
    }
    return gameState
    
    
}
module.exports = {manageGameState, gameStartState}