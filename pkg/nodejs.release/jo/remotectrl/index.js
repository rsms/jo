//#jopkg{"files":["msgparse.js","remotectrl.js"],"imports":[],"exports":["SentinelFramedMessageParser","RemoteControl"],"babel-runtime":["core-js"],"version":"ibs2ggaw"}
var _$import = function(ref) { var m = require(ref); return m && m.__esModule ? m["default"] || m : m;}
, _$importWC = function(ref) { var m = require(ref); return m && m.__esModule ? m : {"default":m};}
  , _core = _$import("babel-runtime/core-js");
"use strict";

function SentinelFramedMessageParser(sentinel, onFrame) {
  var buf = "";

  var fn = function fn(chunk) {
    var i = 0,
        p;
    if (chunk) {
      while ((p = chunk.indexOf(sentinel, i)) !== -1) {
        if (buf.length) {
          buf += chunk.substr(i, p);
          onFrame(buf);
          buf = "";
        } else {
          onFrame(chunk.substr(i, p));
        }
        i = p + sentinel.length;
      }
      if (i < chunk.length) {
        buf += chunk.substr(i);
      }
    }
  };

  fn.start = function (readable) {
    if (fn.readable) throw new Error("already started");
    fn.readable = readable;
    fn.readable.setEncoding("utf8");

    fn.readable.on("data", fn);
  };

  fn.stop = function () {
    fn.readable.removeListener("data", fn);
    fn.readable = null;
  };

  return fn;
}
"use strict";

var origConsole = { log: console.log, warn: console.warn, error: console.error };
var origProcess = { send: process.send };

function RemoteControl(parentPID, oncommand) {
  return new _core.Promise(function (_resolve, _reject) {
    if (RemoteControl.enabled) {
      return _reject(new Error("remote control is aldready enabled"));
    }

    var pendingMessageHandlers = 0,
        stdinDidClose = false;
    var onStdinEnd = function () {
      if (pendingMessageHandlers !== 0) {
        stdinDidClose = true;
      } else {
        resolve();
      }
    };

    var heartbeatTimer;
    var disable = function disable() {
      clearInterval(heartbeatTimer);
      process.stdin.removeListener("end", onStdinEnd);
      for (var k in origConsole) {
        console[k] = origConsole[k];
      }
      process.send = origProcess.send;
      if (streamReader) {
        streamReader.stop();
      }
      RemoteControl.enabled = false;
    };
    var resolve = function resolve() {
      disable();_resolve();
    };
    var reject = function reject(err) {
      disable();_reject(err);
    };
    var streamReader;

    if (!oncommand) {
      oncommand = function (msg, cb) {
        process.emit("message", msg);cb();
      };
    }

    process.send = function send(message) {
      process.stdout.write(JSON.stringify(message) + "\n");
    };

    streamReader = SentinelFramedMessageParser("\n", function (buf) {
      try {
        var msg = JSON.parse(buf);
        if (!msg || typeof msg !== "object" || msg.type === undefined) {
          reject(new Error("received invalid message"));
        } else {
          ++pendingMessageHandlers;
          oncommand(msg, function () {
            if (--pendingMessageHandlers === 0 && stdinDidClose) {
              resolve();
            }
          });
        }
      } catch (err) {
        reject(err);
      }
    });
    streamReader.start(process.stdin);

    process.stdin.once("end", onStdinEnd);

    if (parentPID && !isNaN(parentPID = parseInt(parentPID)) && parentPID > 0) {
      heartbeatTimer = setInterval(function () {
        try {
          process.kill(parentPID, "SIGCHLD");
        } catch (e) {
          reject(new Error("parent process not responding"));
        }
      }, 1000);
    }

    var send_log = function send_log(level, message) {
      message = message.map(function (v) {
        return typeof v === "string" ? v : JSON.stringify(v);
      }).join(" ");
      process.send({ type: "log", level: level, message: message });
    };
    var slice = function slice(v, n) {
      return Array.prototype.slice.call(v, n);
    };
    console.log = function () {
      send_log("i", slice(arguments));
    };
    console.warn = function () {
      send_log("w", slice(arguments));
    };
    console.error = function () {
      send_log("e", slice(arguments));
    };

    RemoteControl.enabled = true;
  });
}
exports.SentinelFramedMessageParser = SentinelFramedMessageParser;
exports.RemoteControl = RemoteControl;
//#sourceMappingURL=index.js.map
