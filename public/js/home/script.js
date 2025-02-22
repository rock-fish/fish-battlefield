//fish jumping animation
const board = document.querySelector('#fish-throw');
class Fish { //fish
  constructor(x) {
    //starting position of fish
    this.x = x;
    this.y = window.innerHeight;

    this.size = 100 + Math.random() * 50; //size of fish

    this.velocity = 10 + Math.random() * 15; //starting velocity
    this.dx = ((Math.random() < .5) * 2 - 1) * 3; //get direction of x movement

    this.img = document.createElement('img'); //image element
    this.img.classList.add("fish"); //add fish class to image element
    this.img.src = '/images/home/fish-effect.svg'; //set source of element
    this.img.style.left = this.x + 'px'; //set x of image
    this.img.style.top = this.y + 'px'; //set y of image
    this.img.width = this.size; //set size of image
    this.img.setAttribute('draggable', 'false'); //make image undraggable
    if (this.dx < 0) this.img.style.transform = 'scaleX(-1)'; //flip image depending on direction of x movement
    
    board.appendChild(this.img); //add image element to board
  }

  updateImage() { //update actual fish element
    this.img.style.left = this.x + 'px'; //set x of image
    this.img.style.top = this.y + 'px'; //set y of image
  }

  jump() {
    this.y -= this.velocity; //increase y
    this.x += this.dx; //update x position
    this.updateImage(); //update image on screen

    this.velocity -= .5; //change gravity
    
    if (this.y > window.innerHeight && this.velocity < 0) { //if fish is moving downwards and it is below the screen
      board.removeChild(this.img); //remove the image from the board
      cancelAnimationFrame(this.jump); //stop looping
    }
    
    requestAnimationFrame(this.jump.bind(this)); //loop
  }
}

function spawnFish() { //spawning fish function

  burst = Math.random() < .05 ? 25 : 1 //make a small chance to create a burst of fish

  if (document.visibilityState === 'visible') { //if document is visible
    for (i in [...Array(burst).keys()]) (new Fish(Math.random() * window.innerWidth)).jump(); //create fish and make it jump
  }
  setTimeout(spawnFish, Math.random() * 5000); //recall function 
}
setTimeout(spawnFish, 3000); //start fish spawning cycle

function checkUsername() { //checks user given username
  const username = document.querySelector('#username').value.trim(); //get value of userame input and remove extra whitespace
  let errMessage; //potential error message

  //if username too short
  if (username.length < 3) errMessage = 'Username should be between 3 and 20 characters.';

  return { //feedback
    bad: !!errMessage, //turns truthy or falsy error message into boolean to show if username is bad
    message: errMessage, //message
    username: username //user given username
  };
}

function submitUsername(type) { //when user submits their username - type should be "join" or "create"
  const usernameDetails = checkUsername(); //get potential error messages from username
  const { username } = usernameDetails; //get username
  if (usernameDetails.bad) document.querySelector('#error').innerText = usernameDetails.message; //update error message
  else {
    //add user data into local storage
    const store = (key, value) => localStorage.setItem(key, value); //helper function (for readability)
    store('username', username); //store username into local storage
    store('timeOfLogin', Date.now()); //get time user logged in for user timeout

    if (type == 'join') window.location = '/join'; //if joining game, go to game id prompt page
    else if (type == 'create') { //request to server to create game
      
      socket.emit('createGame', username, response => { 
        if (!response.failed) { //if no failure
          store('gameId', response.gameId); //store game id into local storage
          store('playerId', response.playerId); //store player id
          store('side', response.side); //store side
          
          window.location = '/play'; //go to play
        } 
        else document.querySelector('#error').innerText = 'An error appeared!  Please try again later.'; //if failure, show error message
      }); 
      
    }
  }
}
