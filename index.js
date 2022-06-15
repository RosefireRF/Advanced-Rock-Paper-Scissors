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
  constructor(id, username){
    this.id = id;
    this.username = username;
  }
}
class Player{
	constructor(id, username){
		this.id = id;
		this.username = username
		this.health = 100;
    this.move;
    this.pref;
	}
}
class Room{
	constructor(Player1, Player2){
		this.players = [Player1, Player2];
		this.name = Player1.username + " vs " + Player2.username;
	}
}
io.on('connection', (socket) => {
    console.log('a user connected');
    socket.on('setUsername', (username) =>{
      listOfUsers.push(new User(socket.id, username));
      io.emit('joinEvent', username)
      console.log(listOfUsers)
      if(listOfUsers.length >= 2){
      	//Create new room with two users
      	Player1 = new Player(listOfUsers[0].id, listOfUsers[0].username);
        listOfPlayers.push(Player1);
      	Player2 = new Player(listOfUsers[1].id, listOfUsers[1].username);
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
      console.log("User with ID of " + socket.id + " made move " + move);
      console.log(listOfPlayers);
      var Player = listOfPlayers.find(element => element.id == socket.id);
      var Room = listOfRooms.find(element => element.players.find(elem => elem.id == socket.id));
      let movesMade = true;
      Player.move = move;
      console.log(Player.username + "'s move is " + Player.move);
      for (var P of Room.players){
        if(typeof P.move == 'undefined')movesMade = false;
      }
      if (movesMade == true){
      for (var P of currentRoom.players){
          sid = P.id
          io.to(sid).emit('moveMade', 'haha');
          Player.move = false;
        }
      }
    })
  });

http.listen(3000, () => {
  console.log('listening on *:3000');
});