# DAN's DRAW!

An online, mobile & PC friendly drawing game.

A combination of Chinese whispers and pictionary, all wrapped up in a neat little web app.

### Files:

`server.js` - The starting point and main file. Contains routing and socket.io setup and logic.

`roomJS.js` - The JavaScript-object based database. Same API could be implemented with Redis for example.

`log.js` - A simple logging utility which console.log's and adds to the publically available log.

`ui.js` - Generates the player HTML UI which is sent to players during game.