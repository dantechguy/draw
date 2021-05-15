const { log } = require('./log.js')
const { rooms } = require('./dataJS.js')
const fs = require('fs')
let { io } = require('./server.js')


const fileData = {
	'lobby': fs.readFileSync("./views/lobby.html").toString(),
	'prompt': fs.readFileSync("./views/prompt.html").toString(),
	'draw': fs.readFileSync("./views/draw.html").toString(),
	'guess': fs.readFileSync("./views/guess.html").toString(),
	'finish': fs.readFileSync("./views/finish.html").toString(),
	'waitprompt': fs.readFileSync("./views/waitprompt.html").toString(),
	'waitdraw': fs.readFileSync("./views/waitdraw.html").toString(),
}

function updateUIForAllPlayersIn(roomName) {
	rooms.getRoomWith(roomName)
		.getPlayerNames()
		.forEach(playerName => {
			updateUIForPlayer(roomName, playerName)
		})
}

function updateUIForAllReadyPlayersIn(roomName) {
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

function generateUI___OLD(roomName, playerName) {
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
	return ui
}


function generateUI(roomName, playerName) {
	let room = rooms.getRoomWith(roomName)
	let player = room.getPlayerWith(playerName)
	let roomHasWaitPage = ['prompt', 'draw', 'guess'].includes(room.state)
	let roomHasPreviousPrompt = ['guess', 'draw'].includes(room.state)
	let notReadyPlayerNames = room.getPlayerNames().filter(playerName => !room.getPlayerWith(playerName).isReady)
	let allPlayersReady = notReadyPlayerNames.length === 0
	let ui;
	
	if (roomHasWaitPage && player.isReady) {
		ui = fileData[ room.state === 'draw'  ? 'waitdraw' : 'waitprompt' ]
		if (allPlayersReady) {
			ui = ui
				.replace('{{nextStateText}}', 'Next round!')
				.replace('{{finishGameText}}', 'Finish game!')
				.replace('{{playerListTitle}}', 'All players ready!')
				.replace('{{notReadyPlayerList}}', '')
		} else {
			ui = ui
				.replace('{{nextStateText}}', 'Skip players and go to next round!')
				.replace('{{finishGameText}}', 'Skip players and finish game!')
				.replace('{{playerListTitle}}', 'Waiting for:')
				.replace('{{notReadyPlayerList}}', `<li>${notReadyPlayerNames.join('</li><li>')}</li>`)
			
		}
		return ui
	}
	
	ui = fileData[room.state]
		.replace('{{roomName}}', roomName)
		.replace('{{playerList}}', `<li>${room.getPlayerNames().join('</li><li>')}</li>`)
		.replace('{{notReadyPlayerList}}', `<li>${notReadyPlayerNames.join('</li><li>')}</li>`)
	
	if (roomHasPreviousPrompt) {
		let previousPlayer = room.getPlayerWith(player.previousPlayerName)
		ui = ui
			.replace('{{previousPrompt}}', previousPlayer.getLatestPrompt())
			.replace('{{previousDrawing}}', previousPlayer.getLatestDrawing())
	}
	 
	return ui
}

module.exports = { updateUIForAllPlayersIn, updateUIForAllReadyPlayersIn, updateUIForPlayer }