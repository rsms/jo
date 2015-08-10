import nodefs from 'fs'
import sourceMap from 'npmjs.com/source-map'
import 'term'

function LoadSourceMapSync(code, readFile) {
  let prefix = '//#sourceMappingURL=';
  let p = code.lastIndexOf(prefix);
  if (p === -1) {
    return null;
  }

  let dataURLPrefix = 'data:application/json;charset:utf-8;base64,';
  p += prefix.length;
  let url = code.substring(p, code.indexOf('\n', p));

  let scheme = '';
  let x = url.indexOf(':');
  if (x !== -1) {
    scheme = url.substr(0, x).toLowerCase();
  }

  let mapContent;
  if (scheme === 'data') {
    let y = url.indexOf(',');
    mapContent = new Buffer(url.substr(y+1), 'base64').toString('utf8');
  } else if (scheme === '' || scheme === 'file') {
    let filename = (scheme === 'file') ? url.substr(5) : url;
    mapContent = nodefs.readFileSync(filename, {encoding:'utf8'});
  } else {
    throw new Error('unable to featch data for source map url "'+url+'"');
  }

  return JSON.parse(mapContent);
}


type SourceInfo = {
  filename: string;
  line: int;
  column: int;
  codeLine: string;
  codeDescription: string;
};

var ccEnds = {};
const ccParen = '('.charCodeAt(0);
ccEnds[ccParen] = ')'.charCodeAt(0);
const ccCurlBracket = '{'.charCodeAt(0);
ccEnds[ccCurlBracket] = '}'.charCodeAt(0);
const ccSquareBracket = '['.charCodeAt(0);
ccEnds[ccSquareBracket] = ']'.charCodeAt(0);
const ccDoubleQuote = '"'.charCodeAt(0);
const ccSingleQuote = "'".charCodeAt(0);
const ccTickQuote = '`'.charCodeAt(0);
const ccSemicolon = ';'.charCodeAt(0);

function findQuotedCodeRange(code:string, offs:int, closeChar:int) {
  let i = offs;
  outer: for (let L = code.length; i !== L; ++i) {
    switch (code.charCodeAt(i)) {
      case '\\': {
        ++i;
        if (i === L) {
          break outer;
        }
        break;
      }
      case closeChar: {
        return [offs, i];
      }
      default: {
        break;
      }
    }
  }
  throw new Error('unterminated string literal at offset '+offs+':'+i);
}

function findCodeRange(code:string, offs:int, closeChar:int=0, depth:int=0) {
  // console.log('findCodeRange:', {offs:offs, closeChar:closeChar, depth:depth})
  let L = code.length;
  for (let i = offs; i !== L; ++i) {
    let c = code.charCodeAt(i);
    let range = null;
    switch (c) {
      case closeChar: {
        return [offs, i];
      }
      case ccDoubleQuote: case ccSingleQuote: case ccTickQuote: {
        range = findQuotedCodeRange(code, i+1, c);
        // console.log('findQuotedCodeRange:', range, code.substring(range[0], range[1]))
        break;
      }
      case ccParen: case ccCurlBracket: case ccSquareBracket: {
        range = findCodeRange(code, i+1, ccEnds[c], depth+1);
        // console.log('range of: '+code[i]+':', range, code.substring(range[0]-1, range[1]+1));
        break;
      }
      case ccSemicolon: {
        if (depth === 0) {
          return [offs, i];
        }
        break;
      }
    }
    if (range) {
      i = range[1];
      if (depth === 0) {
        return [offs, i+1];
      }
    }
  }
  return [offs, L-1];
}


function rangesForLines(s:string, startLine, length) {
  let m, p = 0, r = [], lineno = 0, endLine = startLine + length;
  let re = /\n/g;
  while (m = re.exec(s)) {
    if (lineno >= startLine && lineno < endLine) {
      r.push([p, m.index+1]);
    }
    p = m.index+1;
    ++lineno;
    if (lineno === endLine) {
      break;
    }
  }
  if (p < s.length && lineno >= startLine && lineno < endLine) {
    r.push([p, s.length-1]);
  }
  return r;
}


function trimr(s) {
  return s.replace(/[\s\n]+$/m, '');
}


function interestingSource(code:string, line:int, column:int, contextLines:int) {
  let formatted = '';
  let plain = '';
  let contextLinesBefore = Math.min(contextLines, Math.max(line-1, line-contextLines));
  let startLine = line - contextLinesBefore;
  let lineRanges = rangesForLines(code, startLine-1, 1+(contextLinesBefore + contextLines));
  let lineIndex = contextLinesBefore;
  let grey = term.StderrStyle.grey;
  let bold = term.StderrStyle.bold;
  let maxLineNoLen = String(startLine + lineRanges.length - 1).length;

  for (let i = 0, L = lineRanges.length; i !== L; ++i) {
    let r = lineRanges[i];
    let lineno = String(startLine + i);
    lineno = '        '.substr(0, maxLineNoLen - lineno.length) + lineno;
    formatted += '  ' + grey(lineno) + ' ';
    let lineCode = code.substring(r[0], r[1]);
    if (i === lineIndex) {
      let ir = findCodeRange(lineCode, column);
      plain = lineCode;
      formatted += grey(lineCode.substr(0, ir[0])) +
                   bold(lineCode.substring(ir[0], ir[1])) +
                   grey(trimr(lineCode.substr(ir[1]))) + '\n';
    } else {
      formatted += grey(trimr(lineCode)) + '\n';
    }
  }
  return {formatted: trimr(formatted), plain: trimr(plain)};
}


function SourceForLocation(filename:string, line:int, column:int, contextLines:int) {//:SourceInfo
  if (!filename) {
    return null;
  }

  let srcInfo = {
    filename: filename,
    line:     line,
    column:   column,
    codeLine: '',
    codeDescription: '',
  };

  let srcCode = nodefs.readFileSync(filename, 'utf8');

  // Attempt to load sourcemap and retrieve original source and location
  let map = LoadSourceMapSync(srcCode);
  let origPos = null;
  if (map) {
    let smc = new sourceMap.SourceMapConsumer(map);
    let origPos = smc.originalPositionFor({ line: line, column: column });
    if (origPos && origPos.source && origPos.source[0] === '/') {
      srcCode = nodefs.readFileSync(origPos.source, 'utf8');
      srcInfo.filename = origPos.source;
      srcInfo.line     = origPos.line;
      srcInfo.column   = origPos.column;
    }
  }

  let src = interestingSource(srcCode, srcInfo.line, srcInfo.column, contextLines);
  srcInfo.codeLine = src.plain;
  srcInfo.codeDescription = src.formatted;

  return srcInfo;
}


function SourceForCallSite(cs:CallSite, contextLines:int) { //:SourceInfo?
  return SourceForLocation(
    cs.getFileName() || cs.getScriptNameOrSourceURL(),
    cs.getLineNumber(),
    cs.getColumnNumber() - 1,
    contextLines
  );
}
