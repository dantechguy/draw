const { log } = require('./log.js')
const { rooms } = require('./dataJS.js')
const fs = require('fs')
let { io } = require('./server.js')


const fileData = {
    'lobby': fs.readFileSync("./views/lobby.html").toString(),
    'prompt': fs.readFileSync("./views/prompt.html").toString(),
    'draw': fs.readFileSync("./views/draw.html").toString(),
    'guess': fs.readFileSync("./views/guess.html").toString(),
    'finished': fs.readFileSync("./views/finished.html").toString(),
    'wait': fs.readFileSync("./views/wait.html").toString(),
    'waitready': fs.readFileSync("./views/waitready.html").toString(),
    'waitfinish': fs.readFileSync("./views/waitfinish.html").toString(),
    'waitfinishready': fs.readFileSync("./views/waitfinishready.html").toString(),
}

function updateUIForAllPlayersIn(roomName) {
    log('udpate all players')
    rooms.getRoomWith(roomName)
        .getPlayerNames()
        .forEach(playerName => {
            updateUIForPlayer(roomName, playerName)
        })
}

function updateUIForAllReadyPlayersIn(roomName) {
    log('update ready players')
    let room = rooms.getRoomWith(roomName)
    room.getPlayerNames()
        .filter(playerName => room.getPlayerWith(playerName).isReady)
        .forEach(playerName => {
            updateUIForPlayer(roomName, playerName)
        })
}

function updateUIForPlayer(roomName, playerName) {
    let room = rooms.getRoomWith(roomName)
    let player = room.getPlayerWith(playerName)
    let ui = generateUI(roomName, playerName)
    io.to(player.id).emit('update ui', ui)
}

function generateUI(roomName, playerName) {
    let room = rooms.getRoomWith(roomName),
        notReadyPlayerNames = room.getPlayerNames().filter(playerName => !room.getPlayerWith(playerName).isReady),
        allPlayersReady = notReadyPlayerNames.length === 0,
        player = room.getPlayerWith(playerName),
        readyState = !player.isReady ? 'not ready' : (allPlayersReady ? 'all ready' : 'ready')
    
    let page = {
        'lobby': {  'not ready':    'lobby',
                    'ready':        'lobby',
                    'all ready':    'lobby', },
        'prompt': { 'not ready':    'prompt',
                    'ready':        'wait',
                    'all ready':    'waitready', },
        'draw': {   'not ready':    'draw',
                    'ready':        'waitfinish',
                    'all ready':    'waitfinishready', },
        'guess': {  'not ready':    'guess',
                    'ready':        'wait',
                    'all ready':    'waitready', },
        'finish': { 'not ready':    'finish',
                    'ready':        'finish',
                    'all ready':    'finish', }
    }
    let ui = fileData[page[room.state][readyState]]
        .replace('{{roomName}}', roomName)
        .replace('{{playerList}}', `<li>${room.getPlayerNames().join('</li><li>')}</li>`)
        .replace('{{notReadyPlayerList}}', `<li>${notReadyPlayerNames.join('</li><li>')}</li>`)
        
    if (room.state === 'guess') {
        let previousPlayer = room.getPlayerWith(player.previousPlayerName)
        ui = ui.replace('{{previousDrawing}}', previousPlayer.getLatestDrawing())
    }
    if (room.state === 'draw') {
        let previousPlayer = room.getPlayerWith(player.previousPlayerName)
        ui = ui.replace('{{previousPrompt}}', previousPlayer.getLatestPrompt())
    }
    log(`update player ${playerName}: ${notReadyPlayerNames}: ${readyState}: ${room.state}`)
    return ui
}

module.exports = { updateUIForAllPlayersIn, updateUIForAllReadyPlayersIn, updateUIForPlayer }