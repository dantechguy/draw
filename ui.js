const { log } = require('./log.js')
const { rooms } = require('./dataJS.js')
const fs = require('fs')
let { io } = require('./server.js')


const fileData = {
	'lobby': fs.readFileSync("./views/lobby.html").toString(),
	'prompt': fs.readFileSync("./views/prompt.html").toString(),
	'draw': fs.readFileSync("./views/draw.html").toString(),
	'guess': fs.readFileSync("./views/guess.html").toString(),
	'wait': fs.readFileSync("./views/wait.html").toString(),
	'finish': fs.readFileSync("./views/finish.html").toString(),
	'review': fs.readFileSync("./views/review.html").toString(),
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

function generateUI(roomName, playerName) {
	let room = rooms.getRoomWith(roomName)
	let player = room.getPlayerWith(playerName)
	
	let roomHasWaitPage = ['prompt', 'draw', 'guess'].includes(room.state)
	let state = (roomHasWaitPage && player.isReady) ? 'wait' : room.state
	
	let roomHasPreviousPrompt = ['guess', 'draw'].includes(state)
	
	let notReadyPlayerNames = room.getPlayerNames().filter(playerName => !room.getPlayerWith(playerName).isReady)
	let allPlayersReady = notReadyPlayerNames.length === 0
	
	let ui;

	
	ui = fileData[state]
		.replace(/{{roomName}}/g, roomName)
		.replace(/{{playerList}}/g, `<li>${room.getPlayerNames().join('</li><li>')}</li>`)
		.replace(/{{notReadyPlayerListTitle}}/g, allPlayersReady ? 'All players ready!' : 'Waiting for:')
		.replace(/{{notReadyPlayerList}}/g, `<li>${notReadyPlayerNames.join('</li><li>')}</li>`)
		.replace(/{{notAllPlayersReadyHiddenClass}}/g, allPlayersReady ? '' : 'hidden')
		
	
	if (roomHasPreviousPrompt) {
		let previousPlayer = room.getPlayerWith(player.previousPlayerName)
		ui = ui
			.replace(/{{previousPrompt}}/g, previousPlayer.getLatestPrompt())
			.replace(/{{previousDrawing}}/g, previousPlayer.getLatestDrawing())
	}
	
	if (state === 'finish') {
		let reviewPlayer = room.getPlayerWith(room.reviewPlayerName)
		ui = ui
			.replace(/{{playerName}}/g, room.reviewPlayerName)
			.replace(/{{revealNextText}}/g, room.atEndOfReviewPlayerChain() ? "Next player's chain" : 'Reveal next...')
			.replace(/{{reviewPromptsAndDrawings}}/g, 
				reviewPlayer.chain.slice(0, room.reviewRound).reduce((acc, item) => {
					if (item.type === 'prompts') {
						return acc += `<li> <div>${item.playerName} wrote:</div> <div class='box'>${item.data}</div> </li> <br>`
					} else {
						return acc += `<li> <div>${item.playerName} drew:</div> <img class='box' src="${item.data}"> </li> <br>`
					}
				}, ''))
	}
	 
	return ui
}

module.exports = { updateUIForAllPlayersIn, updateUIForAllReadyPlayersIn, updateUIForPlayer }