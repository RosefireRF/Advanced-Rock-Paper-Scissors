const { SSL_OP_TLS_BLOCK_PADDING_BUG } = require('constants');

const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});
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
		this.name = Player1.username + ` (${Player1.pref}) vs ` + Player2.username + ` (${Player2.pref})`;
	}
}
//Determine which player won the contested throw
function checkContestWinner(players){
  if(players[0].move === 'R'){
    if(players[1].move === 'S') return(0);
    if(players[1].move === 'P') return(1);
  }
  if(players[0].move === 'P'){
    if(players[1].move === 'R') return(0);
    if(players[1].move === 'S') return(1);
  }
  if(players[0].move === 'S'){
    if(players[1].move === 'P') return(0);
    if(players[1].move === 'R') return(1);
  }
}
//Return text to be printed out to players
function calculateDamage(players){
  damage = 10;
  winner = checkContestWinner(players);
  if(players[winner].pref === players[winner].move) damage *= 2;
  //Winner did X damage to player opposite of winner
  /*
  If player[1] is the winner, deal damage to player[1 - 1] (player[0])
  if player[0] is the winner, deal damage to player[1 - 0] (player[1])
  */
  players[1 - winner].health -= damage;
  console.log(players);
  return(`${players[winner].username} did ${damage} damage to ${players[1-winner].username}, they now have ${players[1-winner].health} hp`);
}
io.on('connection', (socket) => {
    console.log('a user connected');
    socket.on('setUsername', data =>{
      listOfUsers.push(new User(socket.id, data.name, data.class));
      io.emit('joinEvent', data.name)
      console.log(listOfUsers)
      if(listOfUsers.length >= 2){
      	//Create new room with two users
      	Player1 = new Player(listOfUsers[0].id, listOfUsers[0].username, listOfUsers[0].pref);
        listOfPlayers.push(Player1);
      	Player2 = new Player(listOfUsers[1].id, listOfUsers[1].username, listOfUsers[1].pref);
        listOfPlayers.push(Player2);
      	listOfUsers.splice(0, 2);
      	console.log("New room created!");
      	console.log(listOfUsers);
      	currentRoom = new Room(Player1, Player2)
      	listOfRooms.push(currentRoom);
        for (var P of currentRoom.players){
          sid = P.id
          io.to(sid).emit('roomJoined', currentRoom.name);
        }
      	console.log(listOfRooms);
      }
    });
    socket.on('moveSelected', (move) =>{
      //Find player that made move and room where it was made
      console.log("User with ID of " + socket.id + " made move " + move);
      var Player = listOfPlayers.find(element => element.id == socket.id);
      var Room = listOfRooms.find(element => element.players.find(elem => elem.id == socket.id));
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
      if(Room.players[0].move === Room.players[1].move){
        for (var P of currentRoom.players){
            sid = P.id
            io.to(sid).emit('moveMade', {type: 1});
            P.move = undefined;
          }
      }
      else{
        text = calculateDamage(Room.players);
        Room.players[0].move = undefined;
        Room.players[1].move = undefined;
        for (var P of currentRoom.players){
            sid = P.id
            io.to(sid).emit('moveMade', {type: 0, text: text});
          }
      }
      }
    })
  });

http.listen(3000, () => {
  console.log('listening on *:3000');
});