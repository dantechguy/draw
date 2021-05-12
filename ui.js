const { rooms, idLookup } = require('./dataJS.js')
const fs = require('fs')
let { io } = require('./server.js')


const fileData = {
    'lobby': fs.readFileSync("./views/lobby.html").toString(),
    'prompt': fs.readFileSync("./views/prompt.html").toString(),
    'draw': fs.readFileSync("./views/draw.html").toString(),
    'guess': fs.readFileSync("./views/guess.html").toString(),
    'finished': fs.readFileSync("./views/finished.html").toString(),
}

const stateFunctions = {
    'lobby': generateLobbyUI,
    'prompt': generatePromptUI,
    'draw': generateDrawUI,
    'guess': generateGuessUI,
    'finished': generateFinishedUI
}

function updateUIForAllPlayersIn(roomName) {
    rooms.getRoomWith(roomName)
        .getPlayerNames()
        .forEach(playerName => {
            updateUIForPlayer(roomName, playerName)
        })
}

function updateUIForAllReadyPlayersIn(roomName) {
    rooms.getRoomWith(roomName)
        .getPlayerNames()
        .filter(playerName => room.getPlayerWith(playerName).isReady)
        .forEach(playerName => {
            updateUIForPlayer(roomName, playerName)
        })
}

function updateUIForPlayer(roomName, playerName) {
    let room = rooms.getRoomWith(roomName)
    let player = room.getPlayerWith(playerName)
    let ui = stateFunctions[room.state](roomName, playerName)
    io.to(player.id).emit('update ui', ui)
}

function generateLobbyUI(roomName, playerName) {
    let room = rooms.getRoomWith(roomName)
    return fileData['lobby']
        .replace('{{roomName}}', roomName)
        .replace('{{playerList}}', `<li>${room.getPlayerNames().join('</li><li>')}</li>`)
}

function generatePromptUI(roomName, playerName) {
    return fileData['prompt']
}

function generateDrawUI(roomName, playerName) {
    let room = rooms.getRoomWith(roomName)
    let player = room.getPlayerWith(playerName)
    let previousPlayer = room.getPlayerWith(player.previousPlayer)
    let previousPrompt = previousPlayer.getLatestPrompt()
    return fileData['draw']
        .replace('{{previousPrompt}}', previousPrompt)
}

function generateGuessUI(roomName, playerName) {
    let room = rooms.getRoomWith(roomName)
    let player = room.getPlayerWith(playerName)
    let previousPlayer = room.getPlayerWith(player.previousPlayer)
    let previousDrawing = previousPlayer.getLatestDrawing()
    return fileData['guess']
        .replace('{{previousDrawing}}', previousDrawing)
}

function generateFinishedUI(roomName, playerName) {
    return fileData['finished']
}

module.exports = { updateUIForAllPlayersIn, updateUIForAllReadyPlayersIn, updateUIForPlayer }