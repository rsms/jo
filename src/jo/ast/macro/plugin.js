function copytok(t) {
  return {
    type:  t.type,
    value: t.value,
    start: t.start,
    end:   t.end,
    loc:   { start: t.startLoc, end: t.endLoc },
  }
}

const kNoMatch = Symbol();
const kExpansionHookCounter = Symbol();
const kOrigNextToken = Symbol();
const kDiagnostics = Symbol();


function pushDiagnostic(type, pos, message, endPos) {
  var lineBreakG = /\r\n?|\n|\u2028|\u2029/g;
  function getLineInfo(input, offset) {
    for (var line = 1, cur = 0;;) {
      lineBreakG.lastIndex = cur;
      var match = lineBreakG.exec(input);
      if (match && match.index < offset) {
        ++line;
        cur = match.index + match[0].length;
      } else {
        return { line: line, column: offset - cur };
      }
    }
  };
  var loc = getLineInfo(this.input, pos);
  var diag = {
    type: type,
    message: message + " (" + loc.line + ":" + loc.column + ")",
    pos:    pos === undefined ? -1 : pos,
    endPos: endPos === undefined ? -1 : endPos,
    loc:    loc,
  };
  if (!this[kDiagnostics]) {
    this[kDiagnostics] = [diag];
  } else {
    this[kDiagnostics].push(diag);
  }
}


function parseTopLevel(inner) {
  return function parseTopLevel(file, program) {
    this.macroCtx = new macroCtx();
    this[kDiagnostics] = null; // Diagnostic[]
    this[kExpansionHookCounter] = 0;
    this.enableMacroExpansionHook();
    var r = inner.apply(this, arguments);
    this.disableMacroExpansionHook();
    //console.log('after parseTopLevel: macros:', repr(this.macroCtx._defScope, 1))
    file.macros = this.macroCtx._defScope[1]; //Map|null
    file.diagnostics = this[kDiagnostics];
    this[kDiagnostics] = null;
    return r;
  }
}


function parseBlock(inner) { return function(allowStrict) {
  // console.log('before parseBlock')
  this.macroCtx.pushMacroDefScope();
  var r = inner.apply(this, arguments);
  this.macroCtx.popMacroDefScope();
  // console.log('after parseBlock',
  //             'macroCtx._defScope:',Object.keys(this.macroCtx._defScope[1]))
  return r;
}}


function parseStatement(inner) { return function() {
  if (this.state.type === tokTypes.name && this.state.value === "macro") {
    this.disableMacroExpansionHook();
    var m = this.startNode();
    this.nextToken(); // read next token and ignore "macro"
    var noopNode = this.parseMacroDefinition(m);
    this.enableMacroExpansionHook();
    return noopNode;
  }
  if (this[kExpansionHookCounter] > 0) {
    // We look to expand any macro here because the parser does not call nextToken
    // when parsing the top-level (program). See parseTopLevel in babylon/parser/statements.js
    // console.log('@ PS call maybeExpandMacro')
    this.maybeExpandMacro();
  }
  return inner.apply(this, arguments);
}}


function enableMacroExpansionHook() {
  if (++this[kExpansionHookCounter] === 1) {
    // console.log('macroExpansionHook:ENABLE ' + (new Error).stack.split(/\n/)[2].trim());
    this.nextToken = function expandMacro$nextToken0() {
      this[kOrigNextToken].apply(this, arguments);
      this.maybeExpandMacro(); // HOTPATH
    };
  } //else console.log('macroExpansionHook:enable ' + (new Error).stack.split(/\n/)[2].trim());
}

function disableMacroExpansionHook() {
  if (--this[kExpansionHookCounter] === 0) {
    //console.log('macroExpansionHook:DISABLE ' + (new Error).stack.split(/\n/)[2].trim());
    this.nextToken = this[kOrigNextToken];
  } //else console.log('macroExpansionHook:disable ' + (new Error).stack.split(/\n/)[2].trim());
}

const kOptIncludeComments = Symbol() // Include comments
    , kOptIncludeDefs = Symbol()     // Generate MacroDefinition AST nodes instead of Noop nodes

// Plugin for Babylon
function Plugin(pp, options) {
  let opts = {
    includeComments: kOptIncludeComments,
    includeDefinitions: kOptIncludeDefs,
  };
  if (options) {
    for (let k in options) {
      if (k in opts && options[k]) {
        pp[opts[k]] = true;
      }
    }
  }

  pp.pushDiagnostic            = pushDiagnostic;
  pp.extend("parseTopLevel",     parseTopLevel);
  pp.extend("parseBlock",        parseBlock);
  pp.extend("parseStatement",    parseStatement);
  pp.parseMacroDefinition      = parseMacroDefinition;
  pp.maybeExpandMacro          = maybeExpandMacro;
  pp.enableMacroExpansionHook  = enableMacroExpansionHook;
  pp.disableMacroExpansionHook = disableMacroExpansionHook;

  pp[kOrigNextToken] = pp.nextToken;
  pp[kExpansionHookCounter] = 0;
}


//            red, green, yellow, blue, magenta, cyan
var colors = {r:'1;31',g:'1;32',y:'1;33',b:'1;34',m:'1;35',c:'1;36'}
  , colorSeqNext = 0
  , colorSeq = Object.keys(colors)
  , color;
if (process.stdout.isTTY) {
  color = function(c, s) {
    if (s === undefined) {
      s = c;
      c = colors[colorSeq[colorSeqNext++ % colorSeq.length]];
    } else if (c in colors) {
      c = colors[c];
    }
    return '\x1b['+c+'m' + s + '\x1b[0;39m';
  };
} else {
  color = function(c, s) { return s || c; };
}
