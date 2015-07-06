import {RemoteControl} from './remotectrl'
import {SrcError} from './util'

var RemoteControlCmd = {
desc: 'Control Jo from another process',
usage: `[-pid <pid>]

Options:
{{options}}

-pid <pid>
  When -pid is provided, Jo will send heartbeat SIGCHLD signals to <pid> at
  regular intervals. When such a heartbeat fail to deliver, the Jo process will
  exit(1). This provides "zombie" protection i.e. when parent process crashes.

Communication
  Remote-control mode uses stdio to communicate using JSON messages separated
  by <LF> ('\\n'). When stdin closes, the Jo process will exit(0).

  Sending an illegal command or arguments causes the Jo process to exit(1).

  Caveats when issuing multiple concurrent commands:
    - You should include an "id" property with some value that is unique to the
      command request.
    - Log messages will _not_ include an "id" and might be out-of order.
    - When receiving a "result" message, you should compare its "id" property
      to some internal set of "pending requests" to know what command request
      actually finished.

Example:
  $ echo '{"type":"runcmd","id":1,"args":["build", "foo"]}' | {{prog}}
  {"type":"log","id":1,level":"i","message":"building package foo"}
  ...
  {"type":"result","id":1,"error":"no source files found in package \"foo\""}

`,
options: {
  pid: '<pid> Parent process identifier',
},
main: async function(opts, args, usage, cb) {
  var sendResult = (err, id) => {
    let r = {type:"result"};
    if (id !== undefined) {
      r.id = id;
    }
    if (err) {
      r.error = err.description || (err.stack ? err.stack.split(/\n+/)[0] : String(err));
      r.diagnostics = SrcError.makeDiagnostics(err);
    }
    process.send(r);
    if (err) {
      console.error(err.stack || String(err));
    }
  };

  await RemoteControl(opts.pid, (msg, cb) => {
    if (msg.type === 'runcmd') {
      // console.log('cmd-remotectrl: invoke', process.argv.slice(0,2).concat(msg.args));
      let f = (err) => {
        sendResult(err, msg.id);
        cb();
      }
      Mainv(process.argv.slice(0,2).concat(msg.args)).then(f).catch(f);
    } else {
      sendResult('unknown remote message "'+msg.type+'"')
      cb();
    }
  })

  console.log('remote control exited')
}}
