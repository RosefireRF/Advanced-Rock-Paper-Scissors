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
		this.name = Player1.username + " vs " + Player2.username;
	}
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
      console.log("User with ID of " + socket.id + " made move " + move);
      var Player = listOfPlayers.find(element => element.id == socket.id);
      var Room = listOfRooms.find(element => element.players.find(elem => elem.id == socket.id));
      let movesMade = true;
      Player.move = move;
      console.log(listOfPlayers);
      console.log(Player.username + "'s move is " + Player.move);
      for (var P of Room.players){
        if(typeof P.move == 'undefined')movesMade = false;
      }
      if (movesMade == true){
      if(Room.players[0].move == Room.players[1].move){
        for (var P of currentRoom.players){
            sid = P.id
            io.to(sid).emit('moveMade', {type: 1});
            P.move = undefined;
          }
      }
      else{
        for (var P of currentRoom.players){
            sid = P.id
            io.to(sid).emit('moveMade', {type: 0});
            P.move = undefined;
          }
      }
      }
    })
  });

http.listen(3000, () => {
  console.log('listening on *:3000');
});