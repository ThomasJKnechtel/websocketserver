const getUserStats = require("../../Modules/sql/getUserStats")
const updatePuzzleRatings = require("../../Modules/sql/updatePuzzleRatings")
const updateRatings = require("../../Modules/sql/updateRatings")
const updateUserStats = require("../../Modules/sql/updateUserStats")
const { store, publish } = require("../../connectToReddis")
const EloChange = require("../../utils/eloCalculator")

async function gameUpdated(id, io){

  const {state, challenger, opponent} = JSON.parse(await store.get(`Game:${id}`))
  if(state.state === "FINISHED" && !state.saved){
    await onGameFinish({state, challenger, opponent})
  }
  if(state.state === "WAITING"){
    challenger.puzzleState.fen = ""
    opponent.puzzleState.fen = ""
  } 
  let message = {state, challenger: {...challenger, puzzleState:{...challenger.puzzleState, continuation: null, nextMove: null}}, opponent: {...opponent, puzzleState:{ ...opponent.puzzleState, continuation: null, nextMove: null}} }
  io.to(`Game:${id}`).emit('game_message', message)
}

async function onGameFinish(gameState){
  const {state, challenger, opponent} = gameState
  const {A, B} = EloChange(challenger.rating, opponent.rating, 40, (challenger.state==="WON")?"A":(challenger.state==="DRAW")?"DRAW":"B")
  updateRatings(challenger.id, challenger.rating+A, opponent.id, opponent.rating+B)
  updatePuzzleRatings(opponent.puzzleStats, challenger.puzzleStats)
  console.log(JSON.stringify({
    dailyStats: [],
    lastUpdated: ""
  }))
  const challengerStats = await getUserStats(challenger.id)
  const opponentStats = await getUserStats(opponent.id)
  updateStats(challenger.id, JSON.parse(challengerStats.user_stats), challenger.rating+A )
  updateStats(opponent.id, JSON.parse(opponentStats.user_stats), opponent.rating+B)
  state.saved = true
  challenger.ratingChange = A
  opponent.ratingChange = B
  store.set(`Game:${state.gameId}`, JSON.stringify({state, challenger, opponent}))
}
async function updateStats(user_id, stats, newRating){
  const currentDate = new Date().toDateString()
  if(stats.lastUpdated !== currentDate){
    stats.dailyStats.push(newRating)
    stats.lastUpdated = currentDate
  }else{
    const todaysMaxRating = stats.dailyStats[-1] 
    if(todaysMaxRating < newRating){
     stats.dailyStats[-1] = newRating
    }
  }
  updateUserStats(user_id, JSON.stringify(stats))
}
module.exports = gameUpdated