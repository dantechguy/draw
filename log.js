let prevLogTime = 0
let maxLogChangeTime = 10*60*60 * 1000 // 10 mins
let timeLength = 5

function log(...msg) {
    msg = msg.join(' ')
    let now = new Date()
    let dt = now - prevLogTime
    if (dt > maxLogChangeTime) {
        let year = now.getFullYear()
        let month = now.getMonth().toString().padStart(2, '0')
        let day = now.getDate().toString().padStart(2, '0')
        let hour = now.getHours().toString().padStart(2, '0')
        let minute = now.getMinutes().toString().padStart(2, '0')
        let second = now.getSeconds().toString().padStart(2, '0')
        msg = `\n[${year}.${month}.${day} ${hour}:${minute}:${second}] ` + msg
    } else if (dt === 0) {
        msg = ' ' + ' '.repeat(timeLength) + '] ' + msg
    } else if (dt < 1000) { // milli secs
        msg = '[' + (''+Math.round(dt)+'ms').padStart(timeLength) + '] ' + msg
    } else if (dt < 60*1000) { // secs
        msg = '[' + (''+Math.round(dt/1000)+'s ').padStart(timeLength) + '] ' + msg
    } else if (dt < 60*60*1000) { // < mins
        msg = '[' + (''+Math.round(dt/(1000*60))+'m ').padStart(timeLength) + '] ' + msg
    } else if (dt < 24*60*60*1000) { // < hours
        msg = '[' + (''+Math.round(dt/(1000*60*60))+'h ').padStart(timeLength) + '] ' + msg
    } else if (dt < 7*24*60*60*1000) { // < days
        msg = '[' + (''+Math.round(dt/(1000*60*60*24))+'d ').padStart(timeLength) + '] ' + msg
    } else if (dt < 30*24*60*60*1000) { // < weeks days
        msg = '[' + (''+Math.round(dt/(1000*60*60*24*7))+'w ').padStart(timeLength) + '] ' + msg
    } else if (dt < 365*24*60*60*1000) { // < months days
        msg = '[' + (''+Math.round(dt/(1000*60*60*24*30))+'m ').padStart(timeLength) + '] ' + msg
    } else { // years
        msg = '[' + (''+Math.round(dt/(1000*60*60*24*365))+'y ').padStart(timeLength) + '] ' + msg
    }
    console.log(msg)
    logs.push(msg)
    prevLogTime = Date.now()
}

const logs = []

module.exports = { log, logs }