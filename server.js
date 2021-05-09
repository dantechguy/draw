// SETUP DATA STORAGE
const { log, logs} = require('./log.js')
const express = require('express')
const app = express()
const server = app.listen(process.env.PORT || 3000)
const io = require("socket.io")(server)
module.exports = { io }
const { rooms, idLookup } = require('./dataJS.js')



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
	socket.on('join', (data) => {
		let { roomName, playerName } = data
		if (rooms.checkRoomNameValid(roomName) && rooms.checkPlayerNameValid(playerName)) {
			if (!rooms.hasRoomWith(roomName)) {
				rooms.createNewRoomWith(roomName)
				log(`+ ${roomName}`)
			}
			let room = rooms.getRoomWith(roomName)
			if (room.state === 'lobby') {
				if (!room.hasPlayerWith(playerName)) {
					room.createNewPlayerWith(playerName, socket.id)
					if (room.getConnectedPlayerCount() === 1)
						room.assignAdmin();
					socket.emit('update ui', '<button class="box blue button">hi</button')
					// TODO: replace above with UI refresh socket message
					log(`+ ${playerName}[${roomName}]`)
				} else {
					socket.emit('failed to join room', 'Name taken')
					log(`x ${playerName}[${roomName}] name taken`)
				}
			} else {
				if (room.hasPlayerWith(playerName)) {
					let player = room.getPlayerWith(playerName)
					if (player.isDisconnected) {
						player.id = socket.id
						player.isConnected = true
						socket.emit('joined room')
						if (room.adminIs(playerName))
							socket.emit('admin');
						// TODO: replace above with UI refresh socket message
						log(`+ ${playerName}[${roomName}]`)
					} else {
						socket.emit('failed to join room', 'Player already connected')
						log(`x ${playerName}[${roomName}] already connected`)
					}
				} else {
					socket.emit('failed to join room', 'Room already started')
					log(`x ${playerName}[${roomName}] room already started`)
				}
			}
		} else {
			socket.emit('failed to join room', 'Invalid room or player name')
			log(`x bad room or name`)
		}
		log(JSON.stringify(rooms))
	})
	
	socket.on('disconnect', (data) => {
		if (idLookup.has(socket.id)) {
			let { roomName, name: playerName } = idLookup.lookup(socket.id)
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
					idLookup.removeId(socket.id)
					log(`- ${playerName}[${roomName}]`)
					if (room.getConnectedPlayerCount() === 0) {
						rooms.deleteRoomWith(roomName)
						log(`- ${roomName}`)
					}
					
				} else {
					// phantom disconnection
					log(`? ${playerName}[${roomName}]`)
				}
			} else {
				// phantom disconnection
				log(`?? ${playerName}[${roomName}]`)
			}
        } else {
			// phantom disconnection
			// can happen if name taken
			log(`???`)
        }
		log(JSON.stringify(rooms))
	})
})

log('Server started')