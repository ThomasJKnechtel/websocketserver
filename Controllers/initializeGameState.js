const {manageGameState, gameStartState} = require("../Modules/gameState/gameState")



async function initializeGame(challenge, store, id){
    const gameState = manageGameState({type:'INITIALIZE', data:challenge}, gameStartState)
    store.set(`Game:${id}`, JSON.stringify(gameState))
}
module.exports = initializeGame