function addMoveToGameState(gameState, move, fen){
    if(gameState.state == "PLAYERS_TURN"){
        if(gameState.nextMove == move){
            gameState.currentMoveNumber += 1 
            gameState.fen = fen
            if(gameState.currentMoveNumber < gameState.continuation.length ){
               gameState.nextMove = gameState.continuation[gameState.currentMoveNumber]
               gameState.state = "OPPONENTS_TURN"
            }else{
                gameState.nextMove = null
                gameState.state = "COMPLETED"
            }
        }else{
            gameState.state = "FAILED"
        }
    }
}
function playMove(gameState, fen){
    if(gameState.state == "OPPONENTS_TURN"){
        
        gameState.currentMoveNumber += 1 
        gameState.fen = fen
        if(gameState.currentMoveNumber < gameState.continuation.length ){
            gameState.nextMove = gameState.continuation[gameState.currentMoveNumber]
            gameState.state = "PLAYERS_TURN"
        }else{
            gameState.state = "COMPLETED"
            gameState.nextMove = null
        }
    }
}

const puzzleStartState = function(fen, continuation, turn, puzzleId, rating){
    return {
        "start_time": Date.now(),
        "continuation" : JSON.parse(continuation),
        "nextMove" : JSON.parse(continuation)[0],
        "state" : "PLAYERS_TURN",
        "fen" : fen,
        "playerTurn" : turn?"w":"b",
        "currentTurn" : turn?"w":"b",
        "startingFEN" : fen, 
        "currentMoveNumber" : 0,
        "finish_time":null,
        "puzzleId": puzzleId, 
        "rating": rating
    }
    
}
module.exports = {addMoveToGameState, playMove, puzzleStartState}