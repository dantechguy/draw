// SETUP DATA STORAGE
const { log, logs} = require('./log.js')
const express = require('express')
const app = express()
const server = app.listen(process.env.PORT || 3000)
const io = require("socket.io")(server)
module.exports = { io }
const { rooms } = require('./dataJS.js')
const { updateUIForAllPlayersIn, 
	updateUIForAllReadyPlayersIn, 
	updateUIForPlayer } = require('./ui.js')



app.use(express.static('public'))

app.get('/', (req, res) => {
	res.sendFile(__dirname + '/views/index.html')
})

app.get('/game/[a-z-]{1,10}/[a-z-]{1,10}', (req, res) => {
	res.sendFile(__dirname + '/views/game.html')
})

app.get('/log', (req, res) => {
	res.send('<pre>'+logs.join('<br>')+'</pre>')
})

app.get('/join/:roomName([a-z-]{1,10})', (req, res) => {
	let roomName = req.params.roomName
	if (rooms.checkRoomNameValid(roomName) && rooms.hasRoomWith(roomName)) {
		let room = rooms.getRoomWith(roomName)
		if (room.state === 'lobby') {
			res.json({started: false, players: room.getPlayerNames()})
		} else {
			res.json({started: true, players: []})
		}
	} else {
		res.json({started: false, players: []})
	}
})

app.get('*', (request, response) => {
	response.status(404)
	response.sendFile(__dirname + '/views/404.html')
})
  



io.on('connection', (socket) => {
	log('+ socket')
	let roomName, playerName;
	
	/** Connects this socket with a player. Defines roomName and playerName if successful */
	socket.on('join', (data) => {		
		let socketNotJoined = typeof roomName === 'undefined' || typeof playerName === 'undefined', 
			validRoomAndPlayerName, roomExists, room, roomInLobby, playerExists, player, playerIsDisconnected;
		if (socketNotJoined) {
			validRoomAndPlayerName = rooms.checkRoomNameValid(data.roomName) && rooms.checkPlayerNameValid(data.playerName)
			if (validRoomAndPlayerName) {
				roomExists = rooms.hasRoomWith(data.roomName)
				if (roomExists) {
					room = rooms.getRoomWith(data.roomName)
					roomInLobby = room.state === 'lobby'
					playerExists = room.hasPlayerWith(data.playerName)
					if (playerExists) {
						player = room.getPlayerWith(data.playerName)
						playerIsDisconnected = !player.isConnected
					}
				}
			}
		}
		
		function newRoomAndPlayer() {
			({ roomName, playerName } = data)
			let room = rooms.createNewRoomWith(roomName)
			room.createNewPlayerWith(playerName, socket.id)
			room.assignAdmin()
			socket.join(roomName)
			updateUIForAllPlayersIn(roomName)
			log(`+ ${roomName}`)
			log(`+ ${playerName}[${roomName}]`)
		}
		
		function newPlayerJoinsRoom() {
			({ roomName, playerName } = data)
			room.createNewPlayerWith(playerName, socket.id)
			socket.join(roomName)
			updateUIForAllPlayersIn(roomName)
			log(`+ ${playerName}[${roomName}]`)
		}
		
		function playerReturnsToRoom() {
			({ roomName, playerName } = data)
			player.id = socket.id
			player.isConnected = true
			if (room.adminIs(playerName))
				socket.emit('admin');
			updateUIForPlayer(roomName, playerName)
			log(`+ ${playerName}[${roomName}]`)
		}
		
		function failedToJoinRoom(reason) {
			socket.emit('failed to join room', reason)
			log(`x ${playerName}[${roomName}] ${reason}`)
		}
		
		/** data = { roomName, playerName } */
		if (socketNotJoined) {
			if (validRoomAndPlayerName) {
				if (!roomExists) { // room doesn't exist
					newRoomAndPlayer()
				} else if (roomInLobby) { // room is in lobby
					if (!playerExists) {
						newPlayerJoinsRoom()
					} else {
						failedToJoinRoom('Name already taken')
					}
				} else { // room has started
					if (playerExists) {
						if (playerIsDisconnected) {
							playerReturnsToRoom()
						} else {
							failedToJoinRoom('Player already connected')
						}
					} else {
						failedToJoinRoom('Room already started')
					}
				}
			} else {
				failedToJoinRoom('Invalid room or player name')
			}
		} else {
			failedToJoinRoom('Socket has already successfully joined')
		}
		log(JSON.stringify(rooms.rooms, null, '  '))
	})
	
	function roomAndPlayerExistAndDisconnectIfNot() {
		let socketHadJoinedRoom = typeof roomName !== 'undefined' && typeof playerName !== 'undefined',
			roomExists, room, playerExists
		if (socketHadJoinedRoom) {
			roomExists = rooms.hasRoomWith(roomName)
			if (roomExists) {
				room = rooms.getRoomWith(roomName)
				playerExists = room.hasPlayerWith(playerName)
			}
		}
		
		function phantomDisconnection(reason) {
			log(reason)
		}
		
		if (socketHadJoinedRoom) {
			if (roomExists) {
				if (playerExists) {
					return true
				} else {
					phantomDisconnection(`- ${playerName}[${roomName}] has its player deleted while connected`)
				}
			} else {
				phantomDisconnection(`- ${playerName}[${roomName}] had its room deleted while connected`)
			}
        } else {
			phantomDisconnection('- roomless socket')
        }
		socket.disconnect(true)
		return false
	}
	
	socket.on('disconnect', (data) => {	
		if (roomAndPlayerExistAndDisconnectIfNot()) {
			let room = rooms.getRoomWith(roomName)
			let player = room.getPlayerWith(playerName)
			let roomInLobby = room.state === 'lobby'
		
			function playerLeftLobby() {
				room.deletePlayerWith(playerName)
				room.assignAdmin()
				updateUIForAllPlayersIn(roomName)
				log(`- ${playerName}[${roomName}]`)
			}
			
			function playerTemporarilyDisconnected() {
				player.id = undefined
				player.isConnected = false
				log(`- ${playerName}[${roomName}]`)
			}
			
			function deleteRoomIfEmpty() {
				if (room.getConnectedPlayerCount() === 0) {
					rooms.deleteRoomWith(roomName)
					log(`- ${roomName}`)
				}
			}
		
			if (roomInLobby) {
				playerLeftLobby()
			} else {
				playerTemporarilyDisconnected()
			}
			deleteRoomIfEmpty()
		}
		log(JSON.stringify(rooms.rooms, null, '  '))
	})
	
	socket.on('next state', (data) => {
		if (roomAndPlayerExistAndDisconnectIfNot) {
			let room = rooms.getRoomWith(roomName)
			let playerIsAdmin = room.adminIs(playerName)
			
			if (playerIsAdmin) {
				room.goToNextState()
			}
		}
		updateUIForAllPlayersIn(roomName)
		log(JSON.stringify(rooms.rooms, null, '  '))
	})
})

log('Server started')