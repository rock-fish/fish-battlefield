//require packages
const socketIO = require('socket.io'); //socket io
const express = require('express'); //express
const http = require('http'); //http
const fs = require('fs'); //file system


//constants
const app = express(); //get express app
const server = http.createServer(app); //create server
const io = new socketIO.Server(server); //new socket.io instance


app.use(express.static(__dirname + '/public')); //expose public folder

app.get('/', (req, res) => { //route handler that sends a file when user hits root of website
  res.sendFile(__dirname + '/public'); //send home file
});


function randId(n) { //helper function for generating random ids (with length n)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890'.split(''); //all possible alphanumeric characters for any ID
  let r = ''; //result variable
  for (let i = 0; i < n; i++) r += chars[Math.floor(Math.random() * chars.length)]; //add chars to result
  return r; //return result
}


let socketsInPlay = []; //sockets who are currently playing


io.on('connection', socket => { //on socket connection
  
  socket.on('joinSocketRoom', info => { //when client requests to join game
    const { gameId, playerId, username, side } = info; //get info from info

    socketsInPlay.push({ //add player to sockets in play
      socketId: socket.id, //socket id
      playerId: playerId, //custom player id
      gameId: gameId, //game id
      username: username //username
    }); 
    
    socket.to(gameId).emit('addPlayer', { username: username, side: side }); //tell all other sockets connected to room that a new player has appeared

    socket.join(gameId); //join room
  });
  

  socket.on('getPlayers', (gameId, callback) => { //when user requests for all players in a game
    fs.readFile(`game/${gameId}/data.json`, (err, data) => { //read data file
      if (err) return callback({ failed: true, error: 'Failed to fetch players' }); //if error
      const json = JSON.parse(data); //get parsed data from file
      return callback({ failed: false, error: null, players: json.players }); //return players
    });
  });
  

  socket.on('disconnect', () => { //on socket disconnection
    const playerInfo = socketsInPlay.find(p => p.socketId === socket.id); //get info of socket that disconnected
    if (!playerInfo) return; //if socket is not in socketsInPlay, they are not leaving a game
    
    const { gameId, playerId, username } = playerInfo; //get game id, player id, and username from object
    
    socketsInPlay.splice(socketsInPlay.indexOf(playerInfo), 1); //remove data from sockets in play array

    fs.readFile(`game/${gameId}/data.json`, (err, data) => { //read game data file
      if (err) return console.log(err); //if error, print error
      
      let json = JSON.parse(data); //parse game file data
      
      const index = json.players.find(p => p.playerId === playerId); //get index of player in players array
      json.players.splice(index, 1); //remove player from array
      
      //if there are no more players
      if (json.players.length === 0) fs.rmSync(`game/${gameId}`, { recursive: true, forced: true }); //remove folder
      else fs.writeFile(`game/${gameId}/data.json`, JSON.stringify(json), console.log); //update json file

      io.to(gameId).emit('removePlayer', username); //server tells all clients in game to remove player
    });
  });
  

  socket.on('createGame', (username, callback) => { //on message from client to create a game

    const gameId = randId(6); //game id - random string with length 6
    const playerId = randId(10); //player id - custom user id

    const game = { //compile game data
      gameId: gameId, //game id
      players: [{ //players array
        id: playerId, //player id
        username: username, //player username
        side: 1 //which side of the board the player possesses
                //1 - top, 2 - right, 3 - bottom, 4 - left
      }],
      cards: [], //array of cards
      markers: [] //aray of markers
    };

    
    fs.mkdir(`game/${gameId}`, err => { //create directory in game folder for game data
      if (err) callback({ failed: true, error: `Failure creating game folder: ${err}` }); //if error, send response to client
      else { //if there is no error
        fs.writeFile(`game/${gameId}/data.json`, JSON.stringify(game), err => { //create a JSON file in directory containing game data
          if (err) callback({ failed: true, error: `Failure creating game JSON file: ${err}` }); //if error, send response to client
          else callback({ failed: false, error: null, gameId: gameId, playerId: playerId, side: 1 }); //if no error, also send response to client and game data to client
        });
      }
    });
  });

  
  socket.on('joinGame', (info, callback) => { //on join request
    const { username, gameId } = info; //get info from client

    //if game does not exist
    if(!fs.existsSync(`game/${gameId}`)) return callback({ failed: true, error: 'Game does not exist!' });

    //get file to append player info
    fs.readFile(`game/${gameId}/data.json`, (err, data) => {
      if (err) return callback({ failed: true, error: `Something mysterious happened.  Please try again later or use another code.`}); //if error, return failure to client
      
      let json = JSON.parse(data); //get and parse room data json

      if (json.players.length > 4) return callback({ failed: true, error: 'This game is full!' }); //if room is full, reject player
      if (json.players.find(p => p.username === username)) return callback({ failed: true, error: 'There is already a player with that username!' }); //if there is a player in the room with that username, reject player
      
      const playerId = randId(10); //get player random id

      const sidesTaken = json.players.map(p => p.side); //get all sides taken by players
      const sides = [1, 2, 3, 4].filter(s => !sidesTaken.includes(s));
      const side = sides[0]; //first side available
      
      json.players.push({ //push player info to json player array
        id: playerId,
        username: username,
        side: side //take first side available
      });

      fs.writeFile(`game/${gameId}/data.json`, JSON.stringify(json), err => { //update data.json file for that game
        if (err) callback({ failed: true, error: `Something mysterious happened.  Please try again later or use another code.`}); //if error, return failure response to client
        else callback({ failed: false, error: null, playerId: playerId, side: side }); //return success message to client with their player id and side on the board
      });
    });
  });

  
  socket.on('updateMousePos', info => { //on mouse move from a client
    const { gameId, username, pos } = info; //get client info
    socket.broadcast.to(gameId).emit('updateMousePos', { username: username, pos: pos }); //send message to clients in room (except sender) to update that user's mouse position
  });

  
  socket.on('createMarker', info => { //when a client creates a marker
    const { gameId } = info; //get game id
    socket.broadcast.to(gameId).emit('createMarker', info); //emit to other clients to create a marker

    //update markers in game file
    fs.readFile(`game/${gameId}/data.json`, (err, data) => {
      if (err) console.log('Error creating marker: ' + err); //log error

      let json = JSON.parse(data); //parse json

      let markerInfo = structuredClone(info); //copy marker info into another variable
      delete markerInfo.gameId; //remove game id property from marker info (not needed)
      
      json.markers.push(markerInfo); //add marker to json markers array

      //update game file
      fs.writeFile(`game/${gameId}/data.json`, JSON.stringify(json), err => {
        if (err) console.log('Error creating marker: ' + err); //log error if there is error
      });
    });
    
  });

  
  socket.on('updateComponentPos', info => { //when client moves component 
    const { gameId } = info; //get game id
    socket.broadcast.to(gameId).emit('updateComponentPos', info) //emit to other clients in game to update component position
  });

  
  socket.on('updateComponentArray', info => {

    const { pcX, pcY, id, compType, gameId } = info; //get percent x and y, id, type of component and game id
    
    //update components array in game file
    fs.readFile(`game/${gameId}/data.json`, (err, data) => {
      let json = JSON.parse(data); //parse json

      const compArray = json[`${compType}s`]; //the array of the type of component in game file
      //compType is the class that the element has -> e.g. marker, card (SINGULAR!)
      
      //iterate through component array
      for (let i = 0; i < compArray.length; i++) {
        
        let compInfo = compArray[i]; //get component being iterated
        
        if (compInfo.id === id) { //find component with same id as one being moved

          //update component position
          compInfo.pcX = pcX;
          compInfo.pcY = pcY;
          
          json[`${compType}s`][i] = compInfo; //update that component info
        }
      }

      //update game file
      fs.writeFile(`game/${gameId}/data.json`, JSON.stringify(json), err => {
        if (err) console.log(`Error updating component array ${compType}: ` + err); //log error if there is error
      });
    });
  });

  
  socket.on('getExistingMarkers', (gameId, callback) => { //when client requests already existing markers (only markers!)
    
    fs.readFile(`game/${gameId}/data.json`, (err, data) => { //read game data file
      if (err) console.log('Error retrieving markers: ' + err); //log error

      callback(JSON.parse(data).markers); //return markers
    });
    
  });
  
  //new socket messages here

  
  
});


const PORT = 3000; //port
//make server listen to requests at PORT
server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
