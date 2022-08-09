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
listOfUsers = [];
listOfPlayers = [];
listOfRooms = [];
mapOfUsers = new Map();
mapOfPlayers = new Map();
class User {
  constructor(id, username, pref, sid){
    this.id = id;
    this.sid = sid;
    this.username = username;
    this.pref = pref;
  }
}
class Player{
	constructor(id, username, pref, roomId, sid){
		this.id = id;
    this.sid = sid;
    this.roomId = roomId;
		this.username = username
		this.health = 100;
    this.move;
    this.pref = pref;
	}
}
class Room{
	constructor(Player1, Player2, sid){
    this.sid = sid;
		this.players = [Player1, Player2];
		this.name = `${Player1.username} (${Player1.pref}) vs ${Player2.username} (${Player2.pref})`;
    this.finished = 0;
	}
}
function removeFromArray(itemToRemove, array){
  let index = binarySearch(array, itemToRemove.sid);
  if(index !== -1) array.splice(index, 1);
}
//Sanitize user input
function binarySearch(array, id){
  let left = 0;
  let right = array.length - 1;
  if(right < 0) return -1;
  let middle;
  while(left<right){
    middle = Math.floor((left + right) / 2);
    if(id > array[middle].sid) left = middle+1;
    else right = middle;
  }
  if(array[left].sid === id) return left;
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
  return string.replace(reg, (match)=>(map[match]));
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
function roomCreation(){
  if(listOfUsers.length < 2){
    if(listOfUsers.length === 1){
      io.to(listOfUsers[0].id).emit('waitingEvent');
    }
    return false;
  };
  let player1 = new Player(listOfUsers[0].id, listOfUsers[0].username, listOfUsers[0].pref, sRoomId, sPlayerId);
  listOfPlayers.push(player1);
  mapOfPlayers.set(listOfUsers[0].id, sPlayerId);
  sPlayerId++;
  let player2 = new Player(listOfUsers[1].id, listOfUsers[1].username, listOfUsers[1].pref, sRoomId, sPlayerId);
  listOfPlayers.push(player2);
  mapOfPlayers.set(listOfUsers[1].id, sPlayerId);
  sPlayerId++;
  listOfUsers.splice(0, 2);
  console.log("New room created!");
  console.log(listOfUsers);
  let currentRoom = new Room(player1, player2, sRoomId);
  listOfRooms.push(currentRoom);
  sRoomId++;
  let textValue = `<span class='${player1.pref}-text'>${player1.username}</span> vs <span class='${player2.pref}-text'>${player2.username}</span> `;
  for (let i = 0; i<2; i++){
    sid = currentRoom.players[i].id;
    io.to(sid).emit('roomJoined', {name: textValue} );
  }
  console.log(listOfRooms);
}
let possibleMoves = ['swords', 'shields', 'bows'];
io.on('connection', (socket) => {
    console.log('a user connected');
    socket.on('setUsername', data =>{
      let name = sanitize(data.name);
      let pref = sanitize(data.pref);
      listOfUsers.push(new User(socket.id, name, pref, sUserId));
      mapOfUsers.set(socket.id, sUserId);
      sUserId++;
      io.to(socket.id).emit('joinEvent', {name: name, pref:pref})
      console.log(listOfUsers)
      roomCreation();
    });
    socket.on('disconnect', reason =>{
      //If user is not player, remove from list of users
      let user = listOfUsers[binarySearch(listOfUsers, mapOfUsers.get(socket.id))];
      if(user) {
        removeFromArray(user, listOfUsers);
        mapOfUsers.delete(socket.id);
        return};
      //If user is player, remove from players, delete room and send opponent to queue
      let player = listOfPlayers[binarySearch(listOfPlayers, mapOfPlayers.get(socket.id))];
      if(player){
        let room = listOfRooms[binarySearch(listOfRooms, player.roomId)];
        leavingPlayerId = room.players.findIndex(player => player.id === socket.id);
        leavingPlayer = room.players[leavingPlayerId];
        stayingPlayer = room.players[1-leavingPlayerId];
        io.to(stayingPlayer.id).emit('opponentLeft');
        removeFromArray(leavingPlayer, listOfPlayers);
        mapOfPlayers.delete(leavingPlayer.id);
        removeFromArray(stayingPlayer, listOfPlayers);
        mapOfPlayers.delete(stayingPlayer.id);
        listOfUsers.push(new User(stayingPlayer.id, stayingPlayer.username, stayingPlayer.pref, sUserId));
        mapOfUsers.set(stayingPlayer.id, sUserId);
        sUserId++;
        removeFromArray(room, listOfRooms)
        roomCreation();
      }
    });
    socket.on('moveSelected', (move) =>{
      //Find player that made move and room where it was made
      console.log("User with ID of " + socket.id + " made move " + move);
      let player = listOfPlayers[binarySearch(listOfPlayers, mapOfPlayers.get(socket.id))];
      //Check if user is not player or if user already made a move
      if(!player || player.move){
        console.log("A player tried to make an illegal move");
        return false;
      }
      if(!move in possibleMoves){
        move = 'swords';
      }
      let room = listOfRooms[binarySearch(listOfRooms, player.roomId)];
      console.log(room);
      let players = room.players;
      let movesMade = true;
      player.move = move;
      console.log(listOfPlayers);
      console.log(player.username + "'s move is " + player.move);
      //If either of the players hasn't made a move, the variable is false
      for (let P of players){
        if(typeof P.move == 'undefined')movesMade = false;
      }
      //If both players chose the same move
      if (movesMade == true){
      if(players[0].move === players[1].move){
        players[0].move = undefined;
        players[1].move = undefined;
        for (let P of players){
            sid = P.id
            io.to(sid).emit('moveMade', {type: 2});
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
            sid = players[i].id;
            text = `<span class='${moves[info.winner]}-text'>${players[info.winner].username}</span> dealt the killing blow to <span class='${moves[1-info.winner]}-text'>${players[1-info.winner].username}</span> winning the game`;
            io.to(sid).emit('moveMade', {type: info.winner, move:moves[1-i], text:text});
          }
        }
        //If the game has not ended this round
        if(room.finished === 0){
          for (let i = 0; i<2; i++){
            sid = players[i].id;
            if(i === info.winner){
              text = `<span class='${moves[info.winner]}-text'>You</span> did ${info.damage} damage to <span class='${moves[1-info.winner]}-text'>${players[1-info.winner].username}</span> they now have ${players[1-info.winner].health} hp`
            }
            else{
              text = `<span class='${moves[1-info.winner]}-text'>You</span> took ${info.damage} damage from <span class='${moves[info.winner]}-text'>${players[info.winner].username}</span>, you now have ${players[1-info.winner].health} hp`
            }
            io.to(sid).emit('moveMade', {type: info.winner, move:moves[1-i], text:text});
          }
        }
        //Process the game ending, send both players to queue;
        if(room.finished === 1){
          removeFromArray(players[0], listOfPlayers);
          removeFromArray(players[1], listOfPlayers);
          for (let P of players){
            listOfUsers.push(new User(P.id, P.username, P.pref, sUserId));
            mapOfUsers.set(P.id, sUserId);
            sUserId++;
            mapOfPlayers.delete(P.id);
            roomCreation();
          }
          removeFromArray(room, listOfRooms);
        }
      }
      }
    })
  });

http.listen(3000, () => {
  console.log('listening on *:3000');
});