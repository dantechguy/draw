const { rooms, idLookup } = require('./dataJS.js')
const fs = require('fs')

const fileData = {
    'lobby': fs.readFileSync("./views/lobby.html").toString(),
    'prompt': fs.readFileSync("./views/prompt.html").toString(),
    'draw': fs.readFileSync("./views/draw.html").toString(),
    'guess': fs.readFileSync("./views/guess.html").toString(),
    'finished': fs.readFileSync("./views/finished.html").toString(),
}

function generateUI(roomName, playerName) {
    let room = rooms.getRoomWith(roomName)
    let player = room.getPlayerWith(playerName)
    switch (room.state) {
        case 'lobby':
            return fileData['lobby']
        case 
    }
}

module.exports = { generateUI }