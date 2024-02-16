const app = require( 'express')();
const http = require( 'http' ).createServer( app );
const cors = require('cors')
require('dotenv').config()

const createChallenge = require('./Routes/createChallenge')
const {store, subscribe, publish} = require('./connectToReddis');
const playerConnected = require('./Routes/playerConnected');
const userDisconnected = require('./Controllers/userDisconnected');
const gameUpdated = require('./Controllers/puzzle_duel/gameUpdated');
const generatePuzzles = require('./Controllers/puzzle_duel/generatePuzzles');
const acceptChallenge = require('./Controllers/puzzle_duel/acceptChallenge');
const challengeAccepted = require('./Routes/acceptChallenge');
const isAuthenticated = require('./Controllers/authentication');
const NOTIFICATIONS = require('./Models/notifications');
const getFriendsById = require('./Modules/sql/getFriends');
const addFriends = require('./Modules/sql/addFriend');
const initializeGame = require('./Controllers/puzzle_duel/initializeGameState');

app.use(cors())
const io = require( 'socket.io' )( http,
  {cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }}
);
subscribe.subscribe('notificationsChannel', async (id, channel)=>{
  const notifications = JSON.parse(await store.get(`Notifications:${id}`))
  io.to(`notificationsRoom:${id}`).emit('notifications', JSON.stringify(notifications))
  notifications.newNotification=null
  await store.set(`Notifications:${id}`, JSON.stringify(notifications))
})
/**
 * On new challenge send challenges to users looking for games
 */
subscribe.subscribe('challengesChannel', async (message, channel)=>{
  const challenges = await store.lRange('challenges', 0, -1)
  if(challenges){
    io.to('challengesRoom').emit('challenges', challenges)
  }else{
    io.to('challengesRoom').emit('challenges', [])
  }
  
})
/**
 * On game update send message to players and if game over save result
 */
subscribe.subscribe(`Games`, async (id, channel)=>{
  await gameUpdated(id, io)
})



io.on( 'connection', async function( socket ) {
    let [user_id, username] = [null, null]

    socket.on('getNotifications', async (token)=>{
      if(token){
        const {sub: userId} = await isAuthenticated(token)
        const hasNotifications = await store.exists(`Notifications:${userId}`)
        if(!hasNotifications) await store.set(`Notifications:${userId}`, JSON.stringify(NOTIFICATIONS))
        await socket.join(`notificationsRoom:${userId}`)
        publish.publish('notificationsChannel', userId)
      }
    })
    socket.on('gamesPgns', async function(message){
       await generatePuzzles(message, socket)
    })

    socket.on('getNotifications', async (token)=>{
      if(token){
        const {sub: userId} = await isAuthenticated(token)
        await socket.join(`notificationsRoom:${userId}`)
        publish.publish('notificationsChannel', userId)
      }
      
    })
    socket.on('FriendRequest', async ({friendId, token})=>{
      const {sub: userId, username} = await isAuthenticated(token)
      if(userId){
        let friendNotifications = JSON.parse(await store.get(`Notifications:${friendId}`))
        friendNotifications.friendRequests.unshift(userId)
        friendNotifications.newNotification = {userId, username, friendRequest: true}
        await store.set(`Notifications:${friendId}`, JSON.stringify(friendNotifications))
        publish.publish('notificationsChannel', friendId)
      }
      
    })
    socket.on('AcceptFriendRequest', async ({friendId, token})=>{
      const {sub: userId, username} = await isAuthenticated(token)
      if(userId){
        const userNotifications = JSON.parse(await store.get(`Notifications:${userId}`))
        const oldList =  userNotifications.friendRequests
        userNotifications.friendRequests = userNotifications.friendRequests.filter(item => item !== friendId)
        const friendNotifications = JSON.parse(await store.get(`Notifications:${friendId}`))
        friendNotifications.friendRequestsAccepted.push({userId, username})
        let userFriends = await getFriendsById(userId)
        let friendsFriends = await getFriendsById(friendId)
        if(userFriends) userFriends += `,${friendId}`
        else userFriends = friendId
        if(friendsFriends) friendsFriends += `,${userId}`
        else friendsFriends = userId
        addFriends(userId, userFriends, friendId, friendsFriends)
        friendNotifications.newNotification={friendRequestAccepted:true, username:username}
        await store.set(`Notifications:${userId}`, JSON.stringify(userNotifications))
        await store.set(`Notifications:${friendId}`, JSON.stringify(friendNotifications))
        publish.publish('notificationsChannel', friendId)
        publish.publish('notificationsChannel', userId)
      }
    })  
    socket.on('play3', ()=>{
        setTimeout(()=>{
          socket.emit('timesUp')
        }, 3000*60)
      })
      socket.on('play5', ()=>{
        setTimeout(()=>{
          socket.emit('timesUp')
        }, 5000*60)
      })
      /**
       * If authenticated Initialize Challenge and Store User Challenge
       */
      socket.on('createChallenge', async (data)=>createChallenge(data, socket))
      socket.on('createFriendChallenge', async ({token, challenge})=>{
        const session = await isAuthenticated(token)

        if(session){
          const date = Date.now()
          const challengeId = `${session.sub}_${date}`
          const notifications = JSON.parse(await store.get(`Notifications:${challenge.friendId}`))
          if(notifications ){
            await store.set(challengeId, JSON.stringify({...challenge, challenger: session.username, challengerId: session.sub}))
            notifications.puzzleDuelChallenges.push({...challenge, challenger: session.username, challengerId: session.sub, challengeId})
            notifications.newNotification={...challenge, challenger: session.username, challengerId: session.sub, challengeId, friendChallenge:true}
            await store.set(`Notifications:${challenge.friendId}`, JSON.stringify(notifications))
            publish.publish('notificationsChannel', challenge.friendId)
          }
        }
       
      })
      socket.on('getChallenges',async ()=>{
        socket.join('challengesRoom')
        const challenges = await store.lRange('challenges', 0, -1)
        if(challenges) socket.emit('challenges', challenges)
      })
      socket.on('challengeAccepted', async (message)=>{
        user_id = await challengeAccepted(message, socket)
      })
      socket.on('setNotifications', async ({token, notifications})=>{
        const {sub} = await isAuthenticated(token)
        await store.set(`Notifications:${sub}`, JSON.stringify(notifications))
        publish.publish('notificationsChannel', sub)
      })
      socket.on('sharePuzzle', async ({token, friendIds, puzzleId})=>{
        const session = await isAuthenticated(token)
        if(session && friendIds){
          friendIds.forEach(async friendId => {
            const notifications = JSON.parse(await store.get(`Notifications:${friendId}`))
            notifications.sharedPuzzles.push({username: session.username, friendId, puzzleId})
            notifications.newNotification = {username: session.username, friendId, puzzleId, sharedPuzzle:true}
            await store.set(`Notifications:${friendId}`, JSON.stringify(notifications))
            publish.publish('notificationsChannel', friendId)
          });
          
        }
      })
      socket.on('friendAcceptsChallenge', async ({token, puzzleIds, challengeId})=>{
        const session = await isAuthenticated(token)
        if(session){
          const notifications = JSON.parse(await store.get(`Notifications:${session.sub}`))
          const newList = notifications.puzzleDuelChallenges.filter(request => request.challengeId !==challengeId)
          notifications.puzzleDuelChallenges = newList
          await store.set(`Notifications:${session.sub}`, JSON.stringify(notifications))
          
          const challenge = JSON.parse(await store.get(challengeId))
          store.del(challengeId)
          const challengerNotifications = JSON.parse(await store.get(`Notifications:${challenge.challengerId}`))
          const challengeResponse = {opponentId:session.sub, opponentUsername: session.username, challengeId}
          challengerNotifications.challengeAccepted = challengeResponse
          challengerNotifications.newNotification = challengeResponse
          await store.set(`Notifications:${challenge.challengerId}`, JSON.stringify(challengerNotifications))
          publish.publish('notificationsChannel', session.sub)
          publish.publish('notificationsChannel', challenge.challengerId)
          
          await initializeGame({...challenge, id:challengeId},store, challengeId   )
          socket.join(`Game:${challengeId}`)
          const gameState = JSON.parse(await store.get(`Game:${challengeId}`))
          if(puzzleIds.length === gameState.state.numberOfPuzzles){
            await acceptChallenge(puzzleIds, gameState, session.sub, session.username, store)
            publish.publish('Games', challengeId)
            
          }
        }
        
      })
      socket.on('ConnectToGame', async (message)=>{
        user_id = await playerConnected(message, socket)
        
      })
      /**
       * On Disconnect remove outgoing user challenges and notify opponent that player disconnected
       */
      socket.on('disconnect', async ()=>{
        await userDisconnected(user_id)
      })
      
});



http.listen( process.env.PORT, async function() {
  console.log( 'listening on *:' + process.env.PORT );
  
});
