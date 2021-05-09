class Rooms {
	constructor() {
		this.rooms = {}
	}
	
	getRoomWith(roomName) {
		return this.rooms[roomName]
	}
	
	createNewRoomWith(roomName) {
		this.rooms[roomName] = new Room(roomName)
	}
	
	deleteRoomWith(roomName) {
		let room = this.getRoomWith(roomName)
		room.getPlayerNames().forEach((playerName) => {
			let id = room.getPlayerWith(playerName).id
			idLookup.removeId(id)
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
		this.state = 'lobby' // lobby, prompt, wait, draw, wait-finish, guess, finish
	}
	
	getPlayerWith(playerName) {
		return this.players[playerName]
	}
	
	hasPlayerWith(playerName) {
		return this.players.hasOwnProperty(playerName)
	}
	
	createNewPlayerWith(playerName, id) {
		this.players[playerName] = new Player(id, playerName)
		idLookup.addId(id, this.name, playerName)
	}
	
	deletePlayerWith(playerName) {
		delete this.players[playerName]
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
}

class Player {
	constructor(id, name) {
		this.id = id
		this.name = name
		this.isConnected = true
	}
	
	get isDisconnected() {
		return !this.isConnected
	}
	
	set isDisconnected(value) {
		this.isConnected = !value
	}
}


class IdLookup {
    constructor() {
        this.ids = {}
    }
    
    addId(id, roomName, playerName) {
        this.ids[id] = {
            roomName: roomName,
            name: playerName,
        }
    }
	
	removeId(id) {
		delete this.ids[id]
	}
	
	has(id) {
		return this.ids.hasOwnProperty(id)
	}
	
	lookup(id) {
		return this.ids[id]
	}
}

const rooms = new Rooms()
const idLookup = new IdLookup()
module.exports = { rooms, idLookup }