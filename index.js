const { SSL_OP_TLS_BLOCK_PADDING_BUG } = require('constants');

const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.use(express.static(__dirname + '/public'));

listOfUsers = [];
listOfPlayers = [];
listOfRooms = [];
class User {
  constructor(id, username, pref){
    this.id = id;
    this.username = username;
    this.pref = pref;
  }
}
class Player{
	constructor(id, username, pref){
		this.id = id;
		this.username = username
		this.health = 100;
    this.move;
    this.pref = pref;
	}
}
class Room{
	constructor(Player1, Player2){
		this.players = [Player1, Player2];
		this.name = `${Player1.username} (${Player1.pref}) vs ${Player2.username} (${Player2.pref})`;
    this.finished = 0;
	}
}
function removeFromArray(itemToRemove, array){
  let index = array.indexOf(itemToRemove);
  if(index !== -1) array.splice(index, 1);
}
//Sanitize user input
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
function calculateDamage(Room, info){
  var players = Room.players;
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
    Room.finished = 1;
    return;
  }
  return;
}
function roomCreation(){
  if(listOfUsers.length < 2) return false;
  Player1 = new Player(listOfUsers[0].id, listOfUsers[0].username, listOfUsers[0].pref);
  listOfPlayers.push(Player1);
  Player2 = new Player(listOfUsers[1].id, listOfUsers[1].username, listOfUsers[1].pref);
  listOfPlayers.push(Player2);
  listOfUsers.splice(0, 2);
  console.log("New room created!");
  console.log(listOfUsers);
  currentRoom = new Room(Player1, Player2)
  listOfRooms.push(currentRoom);
  for (var i = 0; i<2; i++){
    sid = currentRoom.players[i].id;
    io.to(sid).emit('roomJoined', {name: currentRoom.name} );
  }
  console.log(listOfRooms);
}
let possibleMoves = ['swords', 'shields', 'bows'];
io.on('connection', (socket) => {
    console.log('a user connected');
    socket.on('setUsername', data =>{
      listOfUsers.push(new User(socket.id, sanitize(data.name), sanitize(data.class)));
      io.to(socket.id).emit('joinEvent', data.name)
      console.log(listOfUsers)
      roomCreation();
    });
    socket.on('disconnect', reason =>{
      //If user is not player, remove from list of users
      var user = listOfUsers.find(element => element.id == socket.id);
      if(user) {
        removeFromArray(user, listOfUsers);
        return};
      //If user is player, remove from players, delete room and send opponent to queue
      var Player = listOfPlayers.find(element => element.id == socket.id);
      if(Player){
        var Room = listOfRooms.find(element => element.players.find(elem => elem.id == socket.id));
        leavingPlayerId = Room.players.findIndex(player => player.id === socket.id);
        leavingPlayer = Room.players[leavingPlayerId];
        stayingPlayer = Room.players[1-leavingPlayerId];
        io.to(stayingPlayer.id).emit('opponentLeft');
        removeFromArray(leavingPlayer, listOfPlayers);
        removeFromArray(stayingPlayer, listOfPlayers);
        listOfUsers.push(new User(stayingPlayer.id, stayingPlayer.username, stayingPlayer.pref));
        removeFromArray(Room, listOfRooms)
        roomCreation();
      }
    });
    socket.on('moveSelected', (move) =>{
      //Find player that made move and room where it was made
      console.log("User with ID of " + socket.id + " made move " + move);
      var Player = listOfPlayers.find(element => element.id == socket.id);
      //Check if user is not player or if user already made a move
      if(!Player || Player.move){
        console.log("A player tried to make an illegal move");
        return false;
      }
      if(!move in possibleMoves){
        move = 'swords';
      }
      var Room = listOfRooms.find(element => element.players.find(elem => elem.id == socket.id));
      var players = Room.players;
      let movesMade = true;
      Player.move = move;
      console.log(listOfPlayers);
      console.log(Player.username + "'s move is " + Player.move);
      //If either of the players hasn't made a move, the variable is false
      for (var P of Room.players){
        if(typeof P.move == 'undefined')movesMade = false;
      }
      //If both players chose the same move
      if (movesMade == true){
      if(players[0].move === players[1].move){
        players[0].move = undefined;
        players[1].move = undefined;
        for (var P of currentRoom.players){
            sid = P.id
            io.to(sid).emit('moveMade', {type: 2});
          }
      }
      //If players chose different moves
      else{
        var info = {winner: undefined, damage: undefined};
        var text;
        calculateDamage(Room, info);
        console.log(`The winner is ${info.winner}`);
        moves = [players[0].move, players[1].move];
        Room.players[0].move = undefined;
        Room.players[1].move = undefined;
        //If the game has ended this round
        if(Room.finished === 1){
          for(var i = 0; i<2;i++){
            sid = players[i].id;
            text = `${players[info.winner].username} dealt the killing blow to ${players[1-info.winner].username} winning the game`;
            io.to(sid).emit('moveMade', {type: info.winner, move:moves[1-i], text:text});
          }
        }
        //If the game has not ended this round
        if(Room.finished === 0){
          for (var i = 0; i<2; i++){
            sid = players[i].id;
            if(i === info.winner){
              text = `You did ${info.damage} damage to ${players[1-info.winner].username}, they now have ${players[1-info.winner].health} hp`
            }
            else{
              text = `You took ${info.damage} damage from ${players[info.winner].username}, you now have ${players[1-info.winner].health} hp`
            }
            io.to(sid).emit('moveMade', {type: info.winner, move:moves[1-i], text:text});
          }
        }
        //Process the game ending, send both players to queue;
        if(Room.finished === 1){
          removeFromArray(players[0], listOfPlayers);
          removeFromArray(players[1], listOfPlayers);
          for (var P of Room.players){
            listOfUsers.push(new User(P.id, P.username, P.pref));
          }
          removeFromArray(Room, listOfRooms);
          roomCreation();
        }
      }
      }
    })
  });

http.listen(3000, () => {
  console.log('listening on *:3000');
});