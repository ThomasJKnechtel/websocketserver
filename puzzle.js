import { Chess} from "chess.js";



export default function playPuzzle({fen, continuation, playerColour, move}){
    const game = new Chess(fen)
    const movesLeft = continuation
    let progress = "IN_PROGRESS"
    let fen = fen
    function play(move){
        if(addMove(move)){
            fen = game.fen()
            const opponentMove = getNextMove()
            if(opponentMove){
                try{ 
                    game.move(opponentMove)
                    movesLeft.shift()
                    fen = game.fen()
                }catch(err){
                    console.error(err)
                }
            }
        }
    }
    /**
     * make move
     * @param {Chess.move} move move that player played
     * @returns true if move can be played false otherwise
     */
    function addMove(move){
        try{

            if(game.turn == playerColour){
                 const moveMade = game.move(move)
                 if(__isMoveCorrect(moveMade.san)){
                    movesLeft.shift()
                    if(movesLeft.length=0){
                        progress = "COMPLETED"
                    }
                 }else{
                    progress = "FAILED"
                 }
                 return true
            }
            return false

        }catch{
            return false
        }
    }
    function getNextMove(){
        if(movesLeft.length()>0){
            return movesLeft[0]
        }else{
            return null
        }
    }
    function __isMoveCorrect(move){
        const nextMove = getNextMove()
        game.get
        if(nextMove){
            return nextMove == move
        }
        return false
    }
    play(move)
    return { 'continuation': continuation, 'currentPosition':fen, 'movesLeft':movesLeft }
}