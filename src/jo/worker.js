/*import 'npmjs.com/webworker-threads'

class Chan {
  // Send something to the other side of the channel
  send(value:any) {}

  // Receive something from the other side of the channel.
  // If timeout is a positive number, the operation will fail with an error "timeout" unless
  // a message is received within the time limit. If timeout is zero, the operation fails
  // immediately unless there's already a message ready.
  async recv(timeout?:int) {} //:any
}


_$rt.jo_Chan = function Chan(send) {
  var chan = this;
  var NEXT = chan.constructor._next;
  if (!NEXT) {
    chan.constructor._next = NEXT = Symbol('next');
    chan.constructor[NEXT] = 0;
    chan.constructor.prototype.toString = function() { return 'Chan#'+this.id.toString(16); };
  }
  chan.id = chan.constructor[NEXT]++;
  chan._p = null; // waiting Promise trapped in recv
  chan._h = null; // buffer queue head
  chan._t = null; // buffer queue tail
  chan._e = null; // error set by _fail, sticky
  chan._closed = false;
  chan.send = send;
  chan.recv = function recv(timeout) {
    if (chan._p) {
      console.log(chan+'.recv canceling')
      chan._p[1](new Error("canceled"));
    }
    var pid = String(chan)+'/'+chan.constructor[NEXT]++;
    return new Promise(function(resolve, reject) {
      console.log(pid+'.recv making Promise')
      var v, ores, orej, timer;
      if (chan._e) {
        console.log(pid+'.recv has error')
        return reject(chan._e);
      }
      if (chan._h) {
        // dequeue
        console.log(pid+'.recv dequeue')
        v = chan._h.value;
        chan._h = v.next;
        if (!chan._h) {
          chan._t = null;
        }
        return resolve(v);
      }
      if (chan._closed) {
        console.log(pid+'.recv is closed')
        return reject(new Error('chan closed'));
      }
      if (timeout > 0 && typeof timeout === 'number') {
        console.log(chan+'.recv enable timeout')
        timer = setTimeout(function chan_timeout() {
          reject(new Error("recv timeout"));
        }, timeout);
        ores = resolve;
        resolve = function(v) {
          clearTimeout(timer);
          ores(v);
        };
        orej = reject;
        reject = function(v) {
          clearTimeout(timer);
          orej(v);
        };
      }
      if (timeout === 0) {
        console.log(pid+'.recv reject timeout=0')
        reject(new Error("timeout"));
      } else {
        // wait
        console.log(pid+'.recv wait')
        chan._p = [resolve, reject];
      }
    });
  };
  chan.recv1 = async function recv() {
    if (chan._p) {
      throw new Error("reentrant call to same recv");
    }
    var v, pid = String(chan)+'/'+chan.constructor[NEXT]++;
    if (chan._e) {
      console.log(pid+'.recv has error')
      throw chan._e;
    }
    if (chan._h) {
      // dequeue
      console.log(pid+'.recv dequeue')
      v = chan._h.value;
      chan._h = v.next;
      if (!chan._h) {
        chan._t = null;
      }
      return v;
    }
    if (chan._closed) {
      console.log(pid+'.recv is closed')
      throw new Error('chan closed');
    }
    // wait
    console.log(pid+'.recv wait')
    v = await new Promise((resolve, reject) => {
      console.log(pid+'.recv wait reg promise')
      chan._p = [resolve, reject];
    });
    console.log(pid+'.recv wait done v:', v)
    return v;
  };
  chan._deliver = function(v) {
    var p = chan._p;
    // assert(!chan._e)
    // assert(!chan._closed)
    if (p) {
      // resolve
      console.log(chan+'._deliver resolve');
      chan._p = null;
      p[0](v);
    } else {
      // enqueue
      console.log(chan+'._deliver enqueue');
      if (chan._t) {
        chan._t = {value:v, next:chan._t};
      } else {
        v = {value:v};
        chan._t = v;
        chan._h = v;
      }
    }
  };
  chan._fail = function(err) {
    // assert(err)
    var p = chan._p;
    if (!err) {
      chan._e = new Error('chan failure');
    } else if (err instanceof Error) {
      chan._e = err;
    } else if (typeof err === 'object') {
      if (err.stack) {
        err.toString = function(){ return this.stack; };
        chan._e = err;
      } else {
        chan._e = new Error(err.message || String(err));
      }
    } else {
      chan._e = new Error(String(err));
    }
    if (p) {
      console.log(chan+'._fail resolve');
      chan._p = null;
      p[1](err);
    }
    else console.log(chan+'._fail enqueue');
  };
  chan._close = function(err) {
    if (err) {
      chan._fail(err);
    } else {
      chan._closed = true;
    }
  };
};


_$rt.jo_spawnt = function spawnt(program) {
  var t = threads.create();

  let chan = new _$rt.jo_Chan(v => {
    // Note: buffered
    // t.emitSerialized('message', v);
    t.emit('msg', JSON.stringify(v));
  });

  var endchan = function(err) {
    chan._close(err);
    t.destroy();
    //t.removeAllListeners(); BROKEN
  };

  // t.on('message', function(m) {
  //   console.log('t.on(message) =>', m);
  //   // chan._deliver(m);
  // });

  t.on('msg', function(v) {
    console.log('** t.on(msg) =>', v);
    setTimeout(() => {}, 0); // BUG workaround for yield bug in node 0.12.7
    chan._deliver(JSON.parse(v));
  });

  t.on('task', function(status, v) {
    console.log('** t.on(task) =>', status, v);
    if (status === 'end') {
      // exited cleanly
      endchan();
    } else if (status === 'error') {
      // exited with error
      endchan(v || 'task error');
    }
  });

  if (typeof program !== 'string') {
    program = String(program);
  }

  // var helpersCode = babel.buildExternalHelpers(["async-to-generator"], 'var') + '\n';
  // helpersCode = helpersCode.replace(/babelHelpers(\.|\[| \=)/g, '_$rt$1');

  // TODO: Parse _$rt.x and include all helpers which are needed
  program = `
    (function(){
      var _$rt = {};
      _$rt.asyncToGenerator = ${_$rt.asyncToGenerator};
      _$rt.jo_Chan = ${_$rt.jo_Chan};
      _$rt.defineProperty = ${_$rt.defineProperty};
      var chan = new _$rt.jo_Chan(function(v) {
        thread.emit('msg', JSON.stringify(v));
        // postMessage(v);
      });
      chan.id += ${(t.id+1)*1000000};
      thread.on('msg', function(v){
        console.log('[task] onmsg', v);
        chan._deliver(JSON.parse(v));
      });
      console.log('task starting with ' + chan);
      (${program})()(chan).then(function() {
        thread.emit('task', 'end');
      }).catch(function(err) {
        if (err instanceof Error || (err && typeof err === 'object' && err.stack)) {
          err = err.stack + '\\n    <coroutine>';
        }
        thread.emit('task', 'error', String(err));
      });
    })()`;
  
  console.log('program:', program);
  // console.log('thread:', t);

  t.eval(program, (err, result) => {
    if (err) {
      if (typeof err === 'object') {
        endchan(err.stack || err.message || String(err));
      } else {
        endchan(err);
      }
    }
  });

  return chan
}*/
