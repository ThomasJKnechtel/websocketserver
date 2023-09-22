const {puzzleStartState, playMove, addMoveToGameState} = require('../puzzleState/setPuzzleState')
const {Chess} = require('chess.js')
const EloChange = require('../../utils/eloCalculator')
const gameStartState = {
    state: {
        state: 'LOOKING_FOR_OPPONENT',
        winner: '',
        timeControl:' ',
        startTime:null,
        finishTime: null,
        id: ' ',
        numberOfPuzzles: 0,
    },
    
    challenger: {
        username: ' ',
        id : ' ',
        puzzleIds: [],
        puzzles: [],
        puzzleStats: [],
        puzzleState: {},
        puzzlesCompleted: 0,
        state: "CONNECTED",
        rating:null,
        puzzlesAttempted: 0,
        ratingChange: 0,
    },
    opponent:{
        username: ' ',
        id:' ',
        puzzleIds: [],
        puzzles: [],
        puzzleStats: [],
        puzzleState:{},
        puzzlesCompleted: 0,
        puzzlesAttempted: 0,
        state:"CONNECTED",
        rating:null,
        ratingChange:0
    }
    

   
}
function manageGameState(message, gameState){
    const {type, data} = message
    const {state: oldState, challenger: oldChallenger, opponent: oldOpponent } = gameState
    if(oldState.state === "IN_PROGRESS"){
        if(oldState.finishTime < Date.now()){
           const result = checkWinner(oldState.numberOfPuzzles, oldChallenger.puzzlesAttempted, oldChallenger.puzzlesCompleted, oldOpponent.puzzlesAttempted, oldOpponent.puzzlesCompleted, true)
           if(result==="CHALLENGER_WON")
             return { state: {...oldState, state: "FINISHED"}, challenger: {...oldChallenger, state: "WON"}, opponent: {...oldOpponent, state: "LOST"}}
           else if(result === "OPPONENT_WON")
            return { state: {...oldState, state: "FINISHED"}, challenger: {...oldChallenger, state: "LOST" }, opponent: {...oldOpponent, state: "WON"}}
           else if(result === "DRAW")
            return { state: {...oldState, state: "FINISHED"}, challenger: {...oldChallenger, state: "DRAW"}, opponent: {...oldOpponent, state: "DRAW"}}
        }
    }
    if(type==="INITIALIZE"){
        const {id, challenger, challengerId, timeControl, challengerPuzzleIds} = data
        return {...gameState, state: { ...oldState,id, timeControl, numberOfPuzzles: challengerPuzzleIds.length}, challenger: {...oldChallenger, username:challenger, id:challengerId, puzzleIds:challengerPuzzleIds}}
    }else if(type === "ACCEPTED"){
        const { opponentPuzzles, challengerPuzzles, challengerRating, opponentRating, opponent, opponentId} = data
        if(opponentPuzzles.length === oldState.numberOfPuzzles){
            const {fen, continuation, turn, puzzle_id, rating} = challengerPuzzles.pop()
            const challengerPuzzleState = puzzleStartState(fen, continuation, turn, puzzle_id, rating)
            const {fen: opponentFen, continuation: opponentContinuation, turn: opponentTurn, puzzle_id: opponentPuzzleId, rating: opponentPuzzleRating} = opponentPuzzles.pop()
            const opponentPuzzleState = puzzleStartState(opponentFen, opponentContinuation, opponentTurn, opponentPuzzleId, opponentPuzzleRating)
            return {
                ...gameState, 
                state: {
                    ...oldState, state:"WAITING"
                }, 
                challenger:{
                   ...oldChallenger, puzzles:[...challengerPuzzles], puzzleState: challengerPuzzleState,  rating: challengerRating
                },
                opponent: {
                    ...oldOpponent, puzzles: [...opponentPuzzles], puzzleState:opponentPuzzleState, rating:opponentRating,username:opponent, id:opponentId 
                }
            }
        }
        
        return gameState
    }else if(type === "PLAYER_CONNECTED"){
        const { player_id } = data
        if(oldState.state !== "FINISHED"){
            if(player_id === oldChallenger.id && oldChallenger.state === "DISCONNECTED"){
                return { ...gameState, challenger:{...oldChallenger, state: "CONNECTED"} }
            }else if(player_id === oldOpponent.id && oldOpponent.state === "DISCONNECTED"){
                return { ...gameState, opponent:{...oldOpponent, state: "CONNECTED"}}
            }
        }
        return gameState
    }else if(type === "PLAYER_DISCONNECTED"){
        const { player_id } = data
        if(oldState.state !== "FINISHED"){
            if(player_id === oldChallenger.id && ( oldChallenger.state === "READY" || oldChallenger.state === "CONNECTED" )){
                return { ...gameState, challenger: { ...oldChallenger, state: "DISCONNECTED"}}
            }else if(player_id === oldOpponent.id &&( oldOpponent.state === "READY" || oldOpponent.state === "CONNECTED" )){
                return { ...gameState, opponent: {...oldOpponent, state: "DISCONNECTED"}}
            }
        }
        return gameState
    }else if(type === "ADD_MOVE"){
        const {player_id, move} = data
        if(oldState.state !== "FINISHED"){
            if(oldChallenger.id === player_id && oldChallenger.state === "CONNECTED"){
                return addChallengerMove({oldState, oldChallenger, oldOpponent}, move)
            }else if(oldOpponent.id === player_id && oldOpponent.state === "CONNECTED"){
                return addOpponentMove({oldState, oldChallenger, oldOpponent}, move) 
            }
        }
        return gameState
    }else if(type === "PLAYER_READY"){
        const { player_id } = data
        if(oldState.state === "WAITING"){
            if(player_id === oldChallenger.id && oldOpponent.state === "READY" && oldChallenger.state === "CONNECTED"){
                return {
                    state: {
                        ...oldState, 
                        state: "IN_PROGRESS", 
                        startTime: Date.now(), 
                        finishTime: (oldState.timeControl==="3Minute")?(Date.now()+3*60*1000):(Date.now()+3*60*1000)
                    },
                    challenger: {
                        ...oldChallenger,
                        state: "CONNECTED"
                    },
                    opponent: {
                        ...oldOpponent,
                        state: "CONNECTED"
                    }
                }
            }else if(player_id === oldChallenger.id && oldChallenger.state === "CONNECTED"){
                return {...gameState, challenger: {...oldChallenger, state: "READY"}}
            }else if(player_id === oldOpponent.id && oldOpponent.state === "CONNECTED" && oldChallenger.state === "READY"){
                return {
                    state: {
                        ...oldState, 
                        state: "IN_PROGRESS", 
                        startTime: Date.now(), 
                        finishTime: (oldState.timeControl==="3Minute")?(Date.now()+3*60*1000):(Date.now()+3*60*1000)
                    },
                    challenger: {
                        ...oldChallenger,
                        state: "CONNECTED"
                    },
                    opponent: {
                        ...oldOpponent,
                        state: "CONNECTED"
                    }
                }
            }else if(player_id === oldOpponent.id && oldOpponent.state === "CONNECTED"){
                return {...gameState, opponent: {...oldOpponent, state: "READY"}}
            }
        }
        return gameState
    }else if(type === "RESIGN"){
        const { player_id } = data
        if(oldState.state === "IN_PROGRESS"){
            if(player_id === oldChallenger.id){
                
                return {
                    state: {...oldState, state: "FINISHED"},
                    challenger: {...oldChallenger, state: "LOST"},
                    opponent: {...oldOpponent, state: "WON"}
                }
            }else{
                
                return {
                    state: {...oldState, state: "FINISHED"},
                    challenger: {...oldChallenger, state: "WON"},
                    opponent: {...oldOpponent, state: "LOST"}
                }
            }
           
        }
        return gameState
    }
    return gameState
}

function addChallengerMove({oldState, oldChallenger, oldOpponent}, move){
    const puzzleState = updatePuzzleState(oldChallenger.puzzleState, move)
    if(puzzleState.state === "FAILED" || puzzleState.state === "COMPLETED"){
        const newPlayerState =  puzzleFinished({...oldChallenger, puzzleState})
        const result = checkWinner(oldState.numberOfPuzzles, newPlayerState.puzzlesAttempted, newPlayerState.puzzlesCompleted, oldOpponent.puzzlesAttempted, oldOpponent.puzzlesCompleted, false)
        if(result === "CHALLENGER_WON"){
            return {state: {...oldState, state:"FINISHED"}, challenger: {...newPlayerState, state: "WON"}, opponent: {...oldOpponent, state: "LOST"}}
        }else if(result === "OPPONENT_WON"){
            return {state: {...oldState, state:"FINISHED"}, challenger: {...newPlayerState, state: "LOST"}, opponent: {...oldOpponent, state: "WON"}}
        }else if(result === "DRAW"){
            return {state: {...oldState, state:"FINISHED"}, challenger: {...newPlayerState, state: "DRAW"}, opponent: {...oldOpponent, state: "DRAW"}}
        }else{
            return {state: {...oldState}, challenger: newPlayerState, opponent: oldOpponent}
        }
    }
    return {state: oldState, challenger: {...oldChallenger, puzzleState}, opponent: oldOpponent}
    
}

function addOpponentMove({oldState, oldChallenger, oldOpponent}, move){
    const puzzleState = updatePuzzleState(oldOpponent.puzzleState, move)
    if(puzzleState.state === "FAILED" || puzzleState.state === "COMPLETED"){
        const newPlayerState =  puzzleFinished({...oldOpponent, puzzleState})
        
        const result = checkWinner(oldState.numberOfPuzzles, oldChallenger.puzzlesAttempted, oldChallenger.puzzlesCompleted,  newPlayerState.puzzlesAttempted, newPlayerState.puzzlesCompleted, false)
       
        if(result === "CHALLENGER_WON"){
            return {state: {...oldState, state:"FINISHED"}, challenger: { ...oldChallenger, state: "WON"}, opponent: {...newPlayerState, state: "LOST"}}
        }else if(result === "OPPONENT_WON"){
            return {state: {...oldState, state:"FINISHED"}, challenger: { ...oldChallenger, state: "LOST" }, opponent: {...newPlayerState, state: "WON"}}
        }else if(result === "DRAW"){
            return {state: {...oldState, state:"FINISHED"}, challenger: { ...oldChallenger, state: "DRAW"}, opponent: {...newPlayerState, state: "DRAW"}}
        }else{
            return {state: {...oldState}, challenger: oldChallenger, opponent: newPlayerState}
        }
    }
    return {state: oldState, challenger:oldChallenger, opponent: {...oldOpponent, puzzleState}}
    
}

function updatePuzzleState(oldPuzzleState, move){
    const newPuzzleState = {...oldPuzzleState}
    const game = new Chess(newPuzzleState.fen)
    game.move(move)
    addMoveToGameState(newPuzzleState, move, game.fen())
    if(newPuzzleState.state === "OPPONENTS_TURN"){
        game.move(newPuzzleState.nextMove)
        playMove(newPuzzleState, game.fen())
    }
    return newPuzzleState
}

/**
 * When a puzzle is completed store the result in puzzleStats and update the puzzleState
 * @param {*} oldGameState 
 * @param {*} oldPuzzleState 
 * @returns 
 */
function puzzleFinished(playerState){
    let {puzzlesCompleted, puzzlesAttempted, puzzles, puzzleStats, puzzleState, rating: playerRating} = playerState
    const {start_time, puzzleId, rating, state: result} = playerState.puzzleState 
    puzzlesAttempted += 1
    if(puzzleState.state === "COMPLETED")   puzzlesCompleted += 1
    
    const puzzleStat = {
        timeSpent: Date.now()-start_time,
        result,
        puzzleId,
        rating: puzzleState.rating+ EloChange(playerRating, rating,  20, (result==="COMPLETED")?"A":"B").B
    }
    puzzleStats.push(puzzleStat)
    if(puzzles.length > 0){
        const {fen, continuation, turn, puzzle_id, rating: newPuzzleRating} = puzzles.pop()
        const newPuzzleState = puzzleStartState(fen, continuation, turn, puzzle_id, newPuzzleRating)
        return {...playerState, puzzlesCompleted, puzzlesAttempted, puzzleStats, puzzleState: newPuzzleState, puzzles }
    }
                    
    return {...playerState, puzzlesAttempted, puzzlesCompleted, puzzleStats, state: "FINISHED"}
}
function checkWinner(numberOfPuzzles, challengerPuzzlesAttempted, challengerPuzzlesCompleted, opponentPuzzlesAttempted, opponentPuzzlesCompleted, timesUp){
    console.log("challenger Attempted: %i challenter Completed: %i opponentAttempted: %i opponentCompleted: %i", challengerPuzzlesAttempted, challengerPuzzlesCompleted, opponentPuzzlesAttempted, opponentPuzzlesCompleted)
    const challenerMaxScore = challengerPuzzlesCompleted + (numberOfPuzzles-challengerPuzzlesAttempted)
    const opponentMaxScore = opponentPuzzlesCompleted + (numberOfPuzzles-opponentPuzzlesAttempted)
    if(timesUp){
        if(challengerPuzzlesCompleted > opponentPuzzlesCompleted) return "CHALLENGER_WON"
        else if(challengerPuzzlesCompleted < opponentPuzzlesCompleted) return "OPPONENT_WON"
        else return "DRAW"       
    }else if(challengerPuzzlesCompleted > opponentMaxScore || challengerPuzzlesCompleted === numberOfPuzzles) return "CHALLENGER_WON"
    else if(opponentPuzzlesCompleted > challenerMaxScore || opponentPuzzlesCompleted === numberOfPuzzles) return "OPPONENT_WON"
    else if(opponentPuzzlesAttempted === numberOfPuzzles && challengerPuzzlesAttempted === numberOfPuzzles && opponentPuzzlesCompleted=== challengerPuzzlesCompleted)
        return "DRAW"
    else return "IN_PROGRESS" 
}
module.exports = {manageGameState, gameStartState}