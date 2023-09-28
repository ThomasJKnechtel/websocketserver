const updatePuzzleRatings = require("../../Modules/sql/updatePuzzleRatings")
const updateRatings = require("../../Modules/sql/updateRatings")
const { store, publish } = require("../../connectToReddis")
const EloChange = require("../../utils/eloCalculator")

async function gameUpdated(id, io){

  const {state, challenger, opponent} = JSON.parse(await store.get(`Game:${id}`))
  if(state.state === "FINISHED" && !state.saved){
    const {A, B} = EloChange(challenger.rating, opponent.rating, 40, (challenger.state==="WON")?"A":(challenger.state==="DRAW")?"DRAW":"B")
    updateRatings(challenger.id, challenger.rating+A, opponent.opponentId, opponent.rating+B)
    updatePuzzleRatings(opponent.puzzleStats, challenger.puzzleStats)
    state.saved = true
    challenger.ratingChange = A
    opponent.ratingChange = B
    store.set(`Game:${id}`, JSON.stringify({state, challenger, opponent}))
  }
  if(state.state === "WAITING"){
    challenger.puzzleState.fen = ""
    opponent.puzzleState.fen = ""
  } 
  let message = {state, challenger: {...challenger, puzzleState:{...challenger.puzzleState, continuation: null, nextMove: null}}, opponent: {...opponent, puzzleState:{ ...opponent.puzzleState, continuation: null, nextMove: null}} }
  io.to(`Game:${id}`).emit('game_message', message)
}

module.exports = gameUpdated