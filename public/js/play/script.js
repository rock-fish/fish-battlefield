//file used for user UI, etc.

//show username that user previously submitted in home page
const { username, gameId, playerId, side } = localStorage;

//if there is no username or gameId (data needed to load game)
if (!username || !gameId) console.log()//window.location = '/'; //return to home //COMMENTED OUT
else {
  //set game info (in bottom right)
  document.querySelector('#username').innerHTML = username;
  document.querySelector('#game-id').innerHTML = gameId;
}

const playerList = document.querySelector('#players'); //list of players
const mice = document.querySelector('#mice'); //parent elm that holds all mice

function addPlayer(info) { //add player 
  
  const { username, side } = info;
  
  const listEl = document.createElement('div'); //create div element
  listEl.classList.add('player'); //add player class
  listEl.innerText = username; //set div element text
  playerList.appendChild(listEl); //add player to player 

  if (username !== localStorage['username']) { //don't do anything if the player being added is self

    //mice movement in game.js
    mice.insertAdjacentHTML('beforeend', //add mouse container to end of mice
                            
    //mouse element
    `
      <div id='${username}' class='mouse-container'>
        <img src='/images/play/mouse.svg' class='mouse' draggable='false' />
        <div class='mouse-username'>${username}</div>
      </div> 
    `); 
    
  }
  
}
addPlayer({ username: username, side: side }); //add self

socket.emit('getPlayers', gameId, response => { //get all players already in room
  const { players } = response; //get players
  players?.forEach(p => { if (p.username !== username) addPlayer(p); }); //add players
});

socket.emit('joinSocketRoom', { gameId: gameId, playerId: playerId, username: username, side: side }); //join socket room

socket.on('addPlayer', addPlayer); //when another player joins, add player

socket.on('removePlayer', username => { //when user leaves
  const listEl = Array.from(playerList.childNodes).find(e => e.innerHTML === username); //find player list element with username
  playerList.removeChild(listEl); //remove child

  const mouseEl = Array.from(mice.childNodes).find(e => e.id === username); //get mouse element with username
  mice.removeChild(mouseEl); //remove child
});

window.addEventListener('beforeunload', e => { //if user exits page
  localStorage.clear(); //clear local storage  
});