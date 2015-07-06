// Enables IPC remote control, invoking oncommand to perform commands.
//
// Messages are passed over stdout (sending) and stdin (receiving) as JSON data.
//
// - Keeps the process from exiting, but:
//   - calls process.exit(0) when stdin closes
//   - calls process.exit(1) when SIGCHLD heartbeats fail (only when spcifying `parentPID`)
//
// - Enables `process.send(message:any)` for sending messages to another process.
//
// - If `oncommand` is not provided:
//   - Enables `process.on('message', message:any)` for receiving messages from another process.
//
// - Redirects `console` to `process.send({type:"log", level:string, message:string})`
//   where `level` is either "i" (console.log), "w" (console.warn) or "e" (console.error).
//   where `message` is any log arguments JSON-formatted and space separated, meaning
//      `console.log("a", {b:[1, 2, 3]}, ["c"])`
//      is equivalent to:
//      `process.send({type:"log", level:"i", message:"a {b:[1,2,3]} [c]"})`
//
// If `parentPID` is provided as a positive integer (or positive integer in a string),
// SIGCHLD heartbeats are sent to that pid at regular intervals. If signal delivery
// fails, process.exit is called to immediately terminate the program.
//


var origConsole = {log:console.log, warn:console.warn, error:console.error};
var origProcess = {send:process.send};

function RemoteControl(parentPID, oncommand) { return new Promise((_resolve, _reject) => {
  if (RemoteControl.enabled) {
    return _reject(new Error('remote control is aldready enabled'));
  }

  let pendingMessageHandlers = 0, stdinDidClose = false;
  let onStdinEnd = () => {
    if (pendingMessageHandlers !== 0) {
      stdinDidClose = true;
    } else {
      resolve();
    }
  }

  var heartbeatTimer;
  var disable = function() {
    clearInterval(heartbeatTimer);
    process.stdin.removeListener('end', onStdinEnd);
    for (let k in origConsole) { console[k] = origConsole[k]; }
    process.send = origProcess.send;
    if (streamReader) { streamReader.stop(); }
    RemoteControl.enabled = false;
  }
  var resolve = function() { disable(); _resolve(); }
  var reject = function(err) { disable(); _reject(err); }
  var streamReader;

  // If there's no oncommand function, emit "message" event on process when we receive messages
  if (!oncommand) {
    oncommand = (msg, cb) => { process.emit('message', msg); cb(); }
  }

  // Enable process.send
  process.send = function send(message) {
    process.stdout.write(JSON.stringify(message) + '\n');
  };

  // Read JSON messages on stdin
  streamReader = SentinelFramedMessageParser('\n', function (buf) {
    // process.stderr.write('frame '+buf+'\n');
    try {
      let msg = JSON.parse(buf);
      if (!msg || typeof msg !== "object" || msg.type === undefined) {
        reject(new Error('received invalid message'))
      } else {
        ++pendingMessageHandlers;
        oncommand(msg, () => {
          if (--pendingMessageHandlers === 0 && stdinDidClose) {
            resolve();
          }
        });
      }
    } catch (err) {
      reject(err)
    }
  })
  streamReader.start(process.stdin)

  // resolve promise when stdin closes
  process.stdin.once('end', onStdinEnd)

  if (parentPID && !isNaN(parentPID = parseInt(parentPID)) && parentPID > 0) {
    // Send a heartbeat every second, and kill ourselves if we have no parent.
    // This helps avoid zombie processes when a parent process crashes.
    heartbeatTimer = setInterval(function(){
      try {
        process.kill(parentPID, 'SIGCHLD');
      } catch (e) {
        reject(new Error('parent process not responding'));
      }
    }, 1000);
  }

  // redirect console
  var send_log = function (level, message) {
    message = message.map(function (v) {
      return (typeof v === 'string') ? v : JSON.stringify(v);
    }).join(' ');
    process.send({type:'log', level:level, message:message});
  }
  var slice = function (v, n) { return Array.prototype.slice.call(v, n); }
  console.log   = function() { send_log('i', slice(arguments)); };
  console.warn  = function() { send_log('w', slice(arguments)); };
  console.error = function() { send_log('e', slice(arguments)); };

  RemoteControl.enabled = true;
})}
