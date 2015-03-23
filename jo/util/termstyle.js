var SupportedTerms = ['xterm', 'xterm-color', 'screen', 'vt100', 'vt100-color', 'xterm-256color'];

var style = {
  'bold'      : ['1', '22'],
  'italic'    : ['3', '23'],
  'underline' : ['4', '24'],
  'inverse'   : ['7', '27'],

  'white'     : ['37', '39'],
  'grey'      : ['90', '39'],
  'black'     : ['30', '39'],
  'blue'      : ['34', '39'],
  'cyan'      : ['36', '39'],
  'green'     : ['32', '39'],
  'magenta'   : ['35', '39'],
  'red'       : ['31', '39'],
  'yellow'    : ['33', '39'],

  'boldWhite'     : ['1;37', '0;39'],
  'boldGrey'      : ['1;90', '0;39'],
  'boldBlack'     : ['1;30', '0;39'],
  'boldBlue'      : ['1;34', '0;39'],
  'boldCyan'      : ['1;36', '0;39'],
  'boldGreen'     : ['1;32', '0;39'],
  'boldMagenta'   : ['1;35', '0;39'],
  'boldRed'       : ['1;31', '0;39'],
  'boldYellow'    : ['1;33', '0;39'],

  'italicWhite'     : ['3;37', '0;39'],
  'italicGrey'      : ['3;90', '0;39'],
  'italicBlack'     : ['3;30', '0;39'],
  'italicBlue'      : ['3;34', '0;39'],
  'italicCyan'      : ['3;36', '0;39'],
  'italicGreen'     : ['3;32', '0;39'],
  'italicMagenta'   : ['3;35', '0;39'],
  'italicRed'       : ['3;31', '0;39'],
  'italicYellow'    : ['3;33', '0;39'],
};

function mklazyprop(propname, wstream) {
  var mkobj = function() {
    var obj = {};
    if ((obj.enabled = wstream.isTTY)) {
      Object.keys(style).forEach(function (k) {
        var open = '\x1b['+style[k][0]+'m',
            close = '\x1b['+style[k][1]+'m';
        obj[k] = function(s) { return open+s+close; };
        obj[k].open = open;
        obj[k].close = close;
      });

      var seqNext = 0, seq = [
        ['31', '39'], // red
        ['33', '39'], // yellow
        ['32', '39'], // green
        ['34', '39'], // blue
      ];

      obj.color = function(s) {
        return '\x1b['+seq[seqNext % seq.length][0]+'m' +
               s +
               '\x1b['+seq[seqNext++ % seq.length][1]+'m';
      }
    } else {
      obj.color = function(s) { return s; }
      Object.keys(style).forEach(function (k) { obj[k] = obj.color });
    }
    return obj;
  }
  return { enumerable:true, configurable:true, get: function(){
    var obj = mkobj();
    Object.defineProperty(this, propname, { enumerable:true, value:obj });
    return obj;
  }};
}

export var TermStyle = Object.create(null, {
  stdout: mklazyprop('stdout', process.stdout),
  stderr: mklazyprop('stderr', process.stderr),
});
