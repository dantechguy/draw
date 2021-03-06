let { io } = require('./server.js')
const { log } = require('./log.js')

class Rooms {
	constructor() {
		this.rooms = {}
	}
	
	getRoomWith(roomName) {
		return this.rooms[roomName]
	}
	
	createNewRoomWith(roomName) {
		return this.rooms[roomName] = new Room(roomName)
	}
	
	deleteRoomWith(roomName) {
		let room = this.getRoomWith(roomName)
		room.getPlayerNames().forEach((playerName) => {
			room.deletePlayerWith(playerName)
		})
		delete this.rooms[roomName]
	}
	
	checkRoomNameValid(roomName) {
		// check if string
		if (typeof roomName === 'string' || roomName instanceof String) {
			return roomName.match(/[a-z-]{1,10}/)
		} else {
			return false
		}
	}
	
	checkPlayerNameValid(playerName) {
		// check if string
		if (typeof playerName === 'string' || playerName instanceof String) {
			return playerName.match(/[a-z-]{1,10}/)
		} else {
			return false
		}
	}
	
	hasRoomWith(roomName) {
		return this.rooms.hasOwnProperty(roomName)
	}
}

class Room {
	constructor(name) {
		this.players = {}
		this.name = name
		this.admin = undefined
		this.state = 'lobby' // lobby, prompt, wait, draw, wait-finish, guess, finish
		
		// only used for `finish`
		this.reviewPlayerName;
		this.reviewRound;
	}
	
	getPlayerWith(playerName) {
		return this.players[playerName]
	}
	
	hasPlayerWith(playerName) {
		return this.players.hasOwnProperty(playerName)
	}
	
	createNewPlayerWith(playerName, id) {
		this.players[playerName] = new Player(id, playerName)
	}
	
	deletePlayerWith(playerName) {
		delete this.players[playerName]
		if (this.admin === playerName)
			this.assignAdmin();
	}
	
	getPlayerNames() {
		return Object.keys(this.players)
	}
	
	getConnectedPlayerCount() {
		let total = 0
		Object.values(this.players).forEach((player) => {
			if (player.isConnected)
				total++;
		})
		return total
	}
	
	hasConnectedPlayers() {
		return this.getConnectedPlayerCount() !== 0
	}
	
	assignPlayerLoop() {
		let playerNames = this.getPlayerNames()
		
		for (let i=0; i<playerNames.length; i++) {
			let player = this.getPlayerWith(playerNames[i])
			player.previousPlayerName = playerNames[mod(i-1, playerNames.length)]
			player.nextPlayerName = playerNames[mod(i+1, playerNames.length)]
		}
	}
	
	assignAdmin() {
		if (this.hasConnectedPlayers()) {
			this.admin = this.getPlayerNames()[0]
			let adminPlayer = this.getPlayerWith(this.admin)
			io.to(adminPlayer.id).emit('admin')
		} else {
			this.admin = undefined
			}
	}
	
	adminIs(playerName) {
		return this.admin === playerName
	}
	
	goToNextState() {
		if (this.state === 'lobby')
			this.assignPlayerLoop();
			
		this.state = {
			lobby: 'prompt',
			prompt: 'draw',
			draw: 'guess',
			guess: 'draw',
			finish: 'finish'
		}[this.state]
		
		this.getPlayerNames()
				.forEach(playerName => {
					this.getPlayerWith(playerName).isReady = false })
	}
	
	finishGame() {
		this.state = 'finish'
		this.reviewPlayerName = this.admin
		this.reviewRound = 0
		this.createPlayerChains()
	}
	
	createPlayerChains() {
		this.getPlayerNames()
			.map(playerName => this.getPlayerWith(playerName))
			.forEach(player => {
				let round = 0, chain = player.chain
				while (1) {
					let type = (round % 2 === 0) ? 'prompts' : 'drawings'
					if (typeof player[type][round] === 'undefined') break;
					chain.push({
						type: type,
						data: player[type][round],
						playerName: player.name,
					})
					player = this.getPlayerWith(player.nextPlayerName)
					round++
				}
			})
	}
	
	atEndOfReviewPlayerChain() {
		return this.reviewRound >= this.getPlayerWith(this.reviewPlayerName).chain.length
	}
}

class Player {
	constructor(id, name) {
		this.id = id
		this.name = name
		this.isConnected = true
		this.isReady = true
		this.previousPlayerName;
		this.nextPlayerName;
		
		this.prompts = []
		this.drawings = []
		
		this.chain = []
	}
	
	getLatestDrawing() {
		return this.drawings[this.drawings.length-1]
	}
	
	getLatestPrompt() {
		return this.prompts[this.prompts.length-1]
	}
}

function mod(n, m) {
	return ((n % m) + m) % m;
}

const rooms = new Rooms()
module.exports = { rooms }