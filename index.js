const { SSL_OP_TLS_BLOCK_PADDING_BUG } = require('constants');

const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.use(express.static(__dirname + '/public'));
var sRoomId = 0;
var sPlayerId = 0;
var sUserId = 0;
var possibleMoves = ['swords', 'shields', 'bows'];
arrayOfUsers = [];
arrayOfPlayers = [];
arrayOfRooms = [];
mapOfUsers = new Map();
mapOfPlayers = new Map();
//User class consisting of a socket id, username, move preference and a searchId for the User array
class User {
  constructor(id, username, pref, searchId){
    this.id = id;
    this.searchId = searchId;
    //Input sanitization
    username = sanitize(username);
    pref = sanitize(pref);
    //Guard clauses
    if(username == "" || username.length > 20) username = "Jeremy";
    if(!pref in possibleMoves) pref = "swords";
    this.username = username;
    this.pref = pref;
  }
}
//Player class consisting of the base user information, a room id and a searchId for the Player array
class Player{
	constructor(baseUser, roomId, searchId){
		this.id = baseUser.id;
		this.username = baseUser.username
    this.pref = baseUser.pref;
    this.searchId = searchId;
    this.roomId = roomId;
		this.health = 100;
    this.move;
	}
}
//Room class consisting of the two players and a searchId for the Room array
class Room{
	constructor(Player1, Player2, searchId){
    this.searchId = searchId;
		this.players = [Player1, Player2];
		this.name = `${Player1.username} (${Player1.pref}) vs ${Player2.username} (${Player2.pref})`;
    this.finished = 0;
	}
}
//Remove an item from the appropriate array
function removeFromArray(itemToRemove, array){
  let index = binarySearch(array, itemToRemove.searchId);
  if(index !== -1) array.splice(index, 1);
}
//Perform binary search on any array given a search id
function binarySearch(array, id){
  let left = 0;
  let right = array.length - 1;
  if(right < 0) return -1;
  let middle;
  while(left<right){
    middle = Math.floor((left + right) / 2);
    if(id > array[middle].searchId) left = middle+1;
    else right = middle;
  }
  if(array[left].searchId === id) return left;
  else return -1;
}
function sanitize(string) {
  const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      "/": '&#x2F;',
  };
  const reg = /[&<>"'/]/ig;
  return string.replace(reg, (match)=>(map[match])).replace(/\s/g,'');
}
//Determine which player won the contested throw
function checkContestWinner(players){
  if(players[0].move === 'swords'){
    if(players[1].move === 'bows') return(0);
    if(players[1].move === 'shields') return(1);
  }
  if(players[0].move === 'shields'){
    if(players[1].move === 'swords') return(0);
    if(players[1].move === 'bows') return(1);
  }
  if(players[0].move === 'bows'){
    if(players[1].move === 'shields') return(0);
    if(players[1].move === 'swords') return(1);
  }
}
//Return text to be printed out to players
function calculateDamage(room, info){
  let players = room.players;
  info.damage = 10;
  info.winner = checkContestWinner(players);
  if(players[info.winner].pref === players[info.winner].move) info.damage *= 2;
  //Winner did X damage to player opposite of winner
  /*
  If player[1] is the winner, deal damage to player[1 - 1] (player[0])
  if player[0] is the winner, deal damage to player[1 - 0] (player[1])
  */
  players[1 - info.winner].health -= info.damage;
  if(players[1-info.winner].health <= 0)
  {
    room.finished = 1;
    return;
  }
  return;
}
//Creating a new room
function roomCreation(){
  //If amount of users waiting is one, send them a message telling them to wait
  if(arrayOfUsers.length < 2){
    if(arrayOfUsers.length === 1){
      io.to(arrayOfUsers[0].id).emit('waitingEvent');
    }
    return false;
  };
  //Create the first player out of the first user 
  let player1 = new Player(arrayOfUsers[0], sRoomId, sPlayerId);
  arrayOfPlayers.push(player1);
  mapOfPlayers.set(arrayOfUsers[0].id, sPlayerId);
  //Increment the search player id
  sPlayerId++;
  //Create the second player out of the second user 
  let player2 = new Player(arrayOfUsers[1], sRoomId, sPlayerId);
  arrayOfPlayers.push(player2);
  mapOfPlayers.set(arrayOfUsers[1].id, sPlayerId);
  //Increment the search player id
  sPlayerId++;
  //Remove the users turned into players from the users array
  arrayOfUsers.splice(0, 2);
  console.log("New room created!");
  console.log(arrayOfUsers);
  //Create new room object containing the two players
  let currentRoom = new Room(player1, player2, sRoomId);
  arrayOfRooms.push(currentRoom);
  sRoomId++;
  let textValue = `<span class='${player1.pref}-text'>${player1.username}</span> vs <span class='${player2.pref}-text'>${player2.username}</span> `;
  //Send both players a message letting them know they joined a room
  for (let i = 0; i<2; i++){
    socketId = currentRoom.players[i].id;
    io.to(socketId).emit('roomJoined', {name: textValue} );
  }
  console.log(arrayOfRooms);
}
io.on('connection', (socket) => {
    console.log('a user connected');
    socket.on('setUsername', data =>{
      //When the user selects their username and class, add them to the array of users, increment the searchId for the user array and try to create a room
      arrayOfUsers.push(new User(socket.id, data.name, data.pref, sUserId));
      mapOfUsers.set(socket.id, sUserId);
      sUserId++;
      io.to(socket.id).emit('joinEvent', {name: "You", pref:data.pref});
      console.log(arrayOfUsers);
      roomCreation();
    });
    socket.on('disconnect', reason =>{
      //If the user is not a player, remove them from the array of users
      let user = arrayOfUsers[binarySearch(arrayOfUsers, mapOfUsers.get(socket.id))];
      if(user) {
        removeFromArray(user, arrayOfUsers);
        mapOfUsers.delete(socket.id);
        return};
      //If the user is a player, remove them from players, delete their room and send their opponent to the queue
      let player = arrayOfPlayers[binarySearch(arrayOfPlayers, mapOfPlayers.get(socket.id))];
      if(player){
        let room = arrayOfRooms[binarySearch(arrayOfRooms, player.roomId)];
        leavingPlayerId = room.players.findIndex(player => player.id === socket.id);
        leavingPlayer = room.players[leavingPlayerId];
        stayingPlayer = room.players[1-leavingPlayerId];
        io.to(stayingPlayer.id).emit('opponentLeft');
        removeFromArray(leavingPlayer, arrayOfPlayers);
        mapOfPlayers.delete(leavingPlayer.id);
        removeFromArray(stayingPlayer, arrayOfPlayers);
        mapOfPlayers.delete(stayingPlayer.id);
        arrayOfUsers.push(new User(stayingPlayer.id, stayingPlayer.username, stayingPlayer.pref, sUserId));
        mapOfUsers.set(stayingPlayer.id, sUserId);
        sUserId++;
        removeFromArray(room, arrayOfRooms)
        roomCreation();
      }
    });
    socket.on('moveSelected', (move) =>{
      //Find player that made move and room where it was made
      console.log("User with ID of " + socket.id + " made move " + move);
      let player = arrayOfPlayers[binarySearch(arrayOfPlayers, mapOfPlayers.get(socket.id))];
      //Check if user is not player or if user already made a move
      if(!player || player.move){
        console.log("A player tried to make an illegal move");
        return false;
      }
      if(!move in possibleMoves){
        move = 'swords';
      }
      let room = arrayOfRooms[binarySearch(arrayOfRooms, player.roomId)];
      console.log(room);
      let players = room.players;
      let movesMade = true;
      player.move = move;
      console.log(arrayOfPlayers);
      console.log(player.username + "'s move is " + player.move);
      //If either of the players hasn't made a move, the variable is false
      for (let P of players){
        if(typeof P.move == 'undefined')movesMade = false;
      }
      if(movesMade == true){
      //If both players chose the same move
      if(players[0].move === players[1].move){
        players[0].move = undefined;
        players[1].move = undefined;
        for (let P of players){
            socketId = P.id
            io.to(socketId).emit('moveMade', {type: 2});
          }
      }
      //If players chose different moves
      else{
        let info = {winner: undefined, damage: undefined};
        let text;
        calculateDamage(room, info);
        console.log(`The winner is ${info.winner}`);
        moves = [players[0].move, players[1].move];
        players[0].move = undefined;
        players[1].move = undefined;
        //If the game has ended this round
        if(room.finished === 1){
          for(let i = 0; i<2;i++){
            socketId = players[i].id;
            text = `<span class='${moves[info.winner]}-text'>${players[info.winner].username}</span> dealt the killing blow to <span class='${moves[1-info.winner]}-text'>${players[1-info.winner].username}</span> winning the game`;
            io.to(socketId).emit('moveMade', {type: info.winner, move:moves[1-i], text:text});
          }
        }
        //If the game has not ended this round
        if(room.finished === 0){
          for (let i = 0; i<2; i++){
            socketId = players[i].id;
            if(i === info.winner){
              text = `<span class='${moves[info.winner]}-text'>You</span> did ${info.damage} damage to <span class='${moves[1-info.winner]}-text'>${players[1-info.winner].username}</span> they now have ${players[1-info.winner].health} hp`
            }
            else{
              text = `<span class='${moves[1-info.winner]}-text'>You</span> took ${info.damage} damage from <span class='${moves[info.winner]}-text'>${players[info.winner].username}</span>, you now have ${players[1-info.winner].health} hp`
            }
            io.to(socketId).emit('moveMade', {type: info.winner, move:moves[1-i], text:text});
          }
        }
        //Process the game ending, send both players to queue;
        if(room.finished === 1){
          removeFromArray(players[0], arrayOfPlayers);
          removeFromArray(players[1], arrayOfPlayers);
          for (let P of players){
            arrayOfUsers.push(new User(P.id, P.username, P.pref, sUserId));
            mapOfUsers.set(P.id, sUserId);
            sUserId++;
            mapOfPlayers.delete(P.id);
            roomCreation();
          }
          removeFromArray(room, arrayOfRooms);
        }
      }
      }
    })
  });

http.listen(3000, () => {
  console.log('listening on *:3000');
});