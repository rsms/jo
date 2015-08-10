// Style object which provides styling via shell color codes.
//
// A Style object provides a number of functions named after their effect, like "boldRed". A style
// function takes a single argument which is interpreted as a string, and returns a string with
// the appropriate style codes surrounding the string argument.
// Additionally, each such function has two properties: open and close, each which are strings
// containing the starting (or ending) code(s) for the appropriate style.
//
// Examples:
//
//   Style.boldRed("hello") => "\x1b[1;31mhello\x1b[0;39m"
//   Style.boldRed.open     => "\x1b[1;31m"
//   Style.boldRed.close    => "\x1b[0;39m"
//
var Style = {};

// A Style object which doesn't add style (pass-through).
// Can be used in-place of Style to disable styling.
var DummyStyle = {__proto__:Style};

// Style for stdout
var StdoutStyle:Style;

// Style for stderr
var StderrStyle:Style;

// Returns the most appropriate Style object for `wstream`
function StyleForStream(wstream:WriteStream) {
  return wstream.isTTY ? Style : DummyStyle;
}

// TermSupportsStyle is true if the environment variable "TERM" is recognized as "styleable"
var TermSupportsStyle = false;


var styles = {
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


function init() {
  TermSupportsStyle = process.env.TERM in {
    'xterm':true,
    'xterm-color':true,
    'screen':true,
    'vt100':true,
    'vt100-color':true,
    'xterm-256color':true,
  };

  // Add style functions to Style and DummyStyle
  let passThrough = function(s) { return s; };
  passThrough.open = passThrough.close = '';
  for (let k in styles) {
    let open = '\x1b['+styles[k][0]+'m',
        close = '\x1b['+styles[k][1]+'m',
        f = function(s) { return open+s+close; };
    f.open = open;
    f.close = close;
    Style[k] = f;
    DummyStyle[k] = passThrough;
  }

  if (__DEV__) {
    Object.freeze(Style);
    Object.freeze(DummyStyle);
  }

  if (TermSupportsStyle) {
    StdoutStyle = StyleForStream(process.stdout);
    StderrStyle = StyleForStream(process.stderr);
  } else {
    StdoutStyle = DummyStyle;
    StderrStyle = DummyStyle;
  }
}
