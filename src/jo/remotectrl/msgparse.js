function SentinelFramedMessageParser(sentinel, onFrame) {
  var buf = '';

  var fn = function(chunk) {
    var i = 0, p;
    if (chunk) {
      while ((p = chunk.indexOf(sentinel, i)) !== -1) {
        if (buf.length) {
          buf += chunk.substr(i, p);
          onFrame(buf);
          buf = '';
        } else {
          onFrame(chunk.substr(i, p));
        }
        i = p + sentinel.length;
      }
      if (i < chunk.length) {
        buf += chunk.substr(i);
      }
    }
  }

  fn.start = function(readable) {
    if (fn.readable) throw new Error('already started');
    fn.readable = readable;
    fn.readable.setEncoding('utf8')
    // fn.readable.on('readable', () => { fn(fn.readable.read()); })
    fn.readable.on('data', fn)
  }

  fn.stop = function () {
    fn.readable.removeListener('data', fn)
    fn.readable = null
  }

  return fn
}
