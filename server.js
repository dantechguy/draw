// SETUP DATA STORAGE
const { log, logs} = require('./log.js')
const express = require('express')
const app = express()
const server = app.listen(process.env.PORT || 3000)
const io = require("socket.io")(server)
module.exports = { io }
const { rooms } = require('./dataJS.js')
const { generateUI } = require('./ui.js')



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
	log('socket connected')
	let roomName, playerName;
	
	socket.on('join', (data) => {
		// `data` should have `{ roomName, playerName}`
		if (rooms.checkRoomNameValid(data.roomName) && rooms.checkPlayerNameValid(data.playerName)) {
			if (!rooms.hasRoomWith(data.roomName)) {
				// SUCCESS: NEW ROOM AND PLAYER
				({ roomName, playerName } = data)
				let room = rooms.createNewRoomWith(roomName)
				room.createNewPlayerWith(playerName, socket.id)
				room.assignAdmin();
				socket.emit('update ui', generateUI(roomName, playerName))
				log(`+ ${roomName}`)
				log(`+ ${playerName}[${roomName}]`)
			} else if (room.state === 'lobby') {
				let room = rooms.getRoomWith(data.roomName)
				if (!room.hasPlayerWith(data.playerName)) {
					// SUCCESS: NEW PLAYER JOINS ROOM
					({ roomName, playerName } = data)
					room.createNewPlayerWith(playerName, socket.id)						
					socket.emit('update ui', generateUI(roomName, playerName))
					log(`+ ${playerName}[${roomName}]`)
				} else {
					// FAILURE: NAME ALREADY TAKEN IN LOBBY
					socket.emit('failed to join room', 'Name taken')
					log(`x ${playerName}[${roomName}] name taken`)
				}
			} else {
				let room = rooms.getRoomWith(data.roomName)
				if (room.hasPlayerWith(data.playerName)) {
					let player = room.getPlayerWith(data.playerName)
					if (player.isDisconnected) {
						// SUCCESS: PLAYER RETURNS TO ROOM
						({ roomName, playerName } = data)
						player.id = socket.id
						player.isConnected = true
						socket.emit('update ui', generateUI(roomName, playerName))
						if (room.adminIs(playerName))
							socket.emit('admin');
						log(`+ ${playerName}[${roomName}]`)
					} else {
						// FAILURE: PLAYER IS ALREADY CONNECTED IN ROOM
						socket.emit('failed to join room', 'Player already connected')
						log(`x ${playerName}[${roomName}] already connected`)
					}
				} else {
					// FAILURE: NEW NAME IN ROOM THAT HAS STARTED
					socket.emit('failed to join room', 'Room already started')
					log(`x ${playerName}[${roomName}] room already started`)
				}
			}
		} else {
			// FAILURE: BAD ROOM OR PLAYER NAME
			socket.emit('failed to join room', 'Invalid room or player name')
			log(`x bad room or name`)
		}
		log(JSON.stringify(rooms))
	})
	
	socket.on('disconnect', (data) => {
		if (typeof roomName !== 'undefined') {
			if (rooms.hasRoomWith(roomName)) {
				let room = rooms.getRoomWith(roomName)
				if (room.hasPlayerWith(playerName)) {
					if (room.state === 'lobby') {
						room.deletePlayerWith(playerName)
						room.assignAdmin()
					} else {
						let player = room.getPlayerWith(playerName)
						player.id = undefined
						player.isConnected = false
					}
					log(`- ${playerName}[${roomName}]`)
					if (room.getConnectedPlayerCount() === 0) {
						rooms.deleteRoomWith(roomName)
						log(`- ${roomName}`)
					}
				} else {
					// phantom disconnection
					// socket's player would have to be deleted while the socket was still connected
					log(`??? SOCKET'S PLAYER WAS DELETED WHILE SOCKET WAS CONNECTED ${playerName}[${roomName}]`)
				}
			} else {
				// phantom disconnection
				// the room would have to be deleted while the socket was still connected
				log(`??? SOCKET'S ROOM WAS DELETED WHILE SOCKET WAS CONNECTED ${playerName}[${roomName}]`)
			}
        } else {
			// phantom disconnection
			// socket was connected, but never managed to join a room
			// can happen if visited game page but name was taken, so was returned to home page
			log(`???`)
        }
		log(JSON.stringify(rooms))
	})
	
	socket.on('next state', (data) => {
		log(roomName)
		log('next state')
	})
})

log('Server started')