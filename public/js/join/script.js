const { username } = localStorage; //get username from local storage

if (!username) window.location = '/'; //if no username, return to home page
document.querySelector('#username').innerHTML = username;

const store = (key, value) => localStorage.setItem(key, value); //helper function (for readability)

document.querySelector('#join').addEventListener('click', e => { //on join button click
  
  const gameId = document.querySelector('#game-id').value; //get game id
  //emit message to server for join request
  socket.emit('joinGame', { username: username, gameId: gameId }, response => {
    //if failure, show error message
    if (response.failed) document.querySelector('#error').innerHTML = response.error;
    else { //if no error
      store('playerId', response.playerId); //store player id
      store('gameId', gameId);  //store game id
      store('timeOfLogin', Date.now()); //store time of login for user timeout
      store('side', response.side); //store side of the board player is on

      window.location = '/play'; //go to play 
    }
  });
  
});