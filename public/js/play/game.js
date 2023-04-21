//file used for game mechanics

//gameId, username, playerId declared in script.js

const game = document.querySelector('#game'); //parent game element
const gameboard = document.querySelector('#gameboard'); //gameboard

let isPanning = false; //holds if mouse is down
let xOffset = 0, yOffset = 0; //gameboard offset

let activeComponent = null; //holds any piece of the game that is being moved or dragged by the player

//detect if mouse is down or not
gameboard.addEventListener('mousedown', () => { //if mouse down
  isPanning = true; //user is trying to pan
  gameboard.style.cursor = 'grabbing'; //change cursor
}); 
gameboard.addEventListener('mouseup', () => { //if mouse up
  isPanning = false; //user is done panning
  gameboard.style.cursor = 'grab'; //reset cursor
});
gameboard.addEventListener('mouseout', () => isPanning = false); //if mouse leaves game board, stop panning

gameboard.addEventListener('mousemove', e => { //on mouse move
  
  if (isPanning) { //if panning on gameboard
    xOffset += e.movementX; //change x offset
    yOffset += e.movementY; //change y offset

    const setGameboardPos = (x, y) => { //set position of gameboard 
      game.style.left = `${x}px`;
      game.style.top = `${y}px`;
    };

    //adjust offset if portion of not gameboard is visible
    if (xOffset > 0) xOffset = 0
    if (yOffset > 0) yOffset = 0
    if (xOffset + gameboard.width < window.innerWidth) xOffset = window.innerWidth - gameboard.width; 
    if (yOffset + gameboard.height < window.innerHeight) yOffset = window.innerHeight - gameboard.height; 

    //set final gameboard position
    setGameboardPos(xOffset, yOffset);
  }
  
});



function randId(n) { //helper function for generating random ids (with length n)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''); //all possible alphabetical characters for any ID
  let r = ''; //result variable
  for (let i = 0; i < n; i++) r += chars[Math.floor(Math.random() * chars.length)]; //add chars to result
  return r; //return result
}

function getPositionAsPercent(x, y) { //helper function for getting position of x and y on gameboard relative to width and height, relative to origin
  return { //return value
    pcX: x / gameboard.width, //% of x on gameboard
    pcY: y / gameboard.height //% of y on gameboard
  };
} //multiply by gameboard dimensions to get real position


const markers = document.querySelector("#markers"); //marker container

function createMarker(templateMarker, x, y, id) { //create marker helper function (x, y should be real position)
  
  let marker = templateMarker.cloneNode(); //set duplicated marker as active component 

  const src = marker.src.split('/'); //get marker image src split by slashes
  const markerType = src[src.length - 1].replace('.svg', ''); //get marker type (as 5, 10, 20, etc)
    
  marker.classList.add('marker'); //add marker class
  marker.classList.remove('marker-display'); //remove marker-display class
  marker.id = id; //set marker id

  //position marker
  marker.style.left = `${x}px`;
  marker.style.top = `${y}px`;
    
  markers.appendChild(marker); //add marker to game

  marker.addEventListener('mousedown', e => { //on marker click
    activeComponent = marker; //set active component to marker 
    markers.appendChild(marker); //move marker in front of other markers
  }); 

  return { x: x, y: y, type: markerType, id: marker.id, elm: marker }; //return info about the marker
}

function moveComponent(id, x, y) { //helper function for moving component (x, y should be real position)
  const component = document.querySelector(`#${id}`); //get component element
  
  //move component
  component.style.left = `${x}px`;
  component.style.top = `${y}px`;
}

document.querySelectorAll('.marker-display').forEach(m => { //iterate through marker elements (m)
  
  m.addEventListener('mousedown', e => { //add mouse down event (only works on marker being moved)

    const marker = createMarker(m, e.clientX - xOffset, e.clientY - yOffset, randId(50)); //create marker
    const pos = getPositionAsPercent(e.clientX - xOffset, e.clientY - yOffset); //get marker pos as percent on gameboard

    activeComponent = marker.elm; //set active component to marker

    //emit to all players that marker was created
    socket.emit('createMarker', {
      pcX: pos.pcX, //marker x %
      pcY: pos.pcY,  //marker y %
      type: marker.type, //type of marker
      id: marker.id, //id of marker,

      gameId: gameId //game id
    });
    
  });
  
});

socket.on('createMarker', marker => { //on marker creation
  const { pcX, pcY, type, id } = marker; //get info from marker (x and y are in percentage positions)
  const templateMarker = document.querySelector(`#marker-${type}`); //get template marker (using display marker)
  
  createMarker(templateMarker, pcX * gameboard.width, pcY * gameboard.height, id); //create marker
});

socket.on('updateMousePos', info => { //when another user has updated their mouse position
  const { username, pos } = info; //get username and mouse position

  const mouseEl = Array.from(document.querySelector('#mice').childNodes).find(e => e.id === username); //get mouse element with id username

  //set position of mouse
  mouseEl.style.left = (pos.pcX * gameboard.width) + 'px';
  mouseEl.style.top = (pos.pcY * gameboard.height) + 'px';
});

socket.on('updateComponentPos', info => {
  const { pcX, pcY, id } = info; //get info needed about component to move it

  moveComponent(id, pcX * gameboard.width, pcY * gameboard.height); //move component
});

document.addEventListener('mousemove', e => { //on mouse move

  const pos = getPositionAsPercent(e.clientX - xOffset, e.clientY - yOffset); //get percentage of mouse position on gameboard
  
  socket.emit('updateMousePos', { //emit message to update a user's mouse position
    gameId: gameId, //game id
    username: username, //username of player
    pos: { //position of mouse (percent of mouse x/y relative to gameboard)
      pcX: pos.pcX, //% of mouse x on gameboard
      pcY: pos.pcY //% of mouse y on gameboard
    }
  });

  //if there is an active component
  if (activeComponent) {
    const x = e.clientX - xOffset, y = e.clientY - yOffset; //get x and y

    const { pcX, pcY } = getPositionAsPercent(x, y); //get component position as perecent

    const { id , className: compType } = activeComponent; //get active component id and type of component (marker, card, etc.) via elm class

    moveComponent(id, x, y); //move active component

    socket.emit('updateComponentPos', { pcX: pcX, pcY: pcY, id: id, compType: compType, gameId: gameId }); //emit position change for component 
    
  } 
  
});

//if mouse up on document
document.addEventListener('mouseup', e => {
  const x = e.clientX - xOffset, y = e.clientY - yOffset; //get x and y
  const { pcX, pcY } = getPositionAsPercent(x, y); //get component position as percent on gamebaord
  const { id, className: compType } = activeComponent; //get id of component

  socket.emit('updateComponentArray', { pcX: pcX, pcY: pcY, id: id, gameId: gameId, compType: compType }); //update component array in game file

  activeComponent = null; //reset active component
}); 

socket.emit('getExistingMarkers', gameId, response => { //get existing markers
  const markers = response; //get response = markers array

  for (marker of markers) { //iterate through markers array

    const templateMarker = document.querySelector(`#marker-${marker.type}`); //get template marker
    createMarker(templateMarker, marker.pcX * gameboard.width, marker.pcY * gameboard.height, marker.id); //create marker 
    
  }
  
});