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

const puzzleStartState = function(fen, continuation, turn){
    return {
        "start_time": Date.now(),
        "continuation" : continuation,
        "nextMove" : continuation[0],
        "state" : "PLAYERS_TURN",
        "fen" : fen,
        "playerTurn" : turn?"w":"b",
        "currentTurn" : turn?"w":"b",
        "startingFEN" : fen, 
        "currentMoveNumber" : 0,
        "finish_time":null
    }
    
}
module.exports = {addMoveToGameState, playMove, puzzleStartState}