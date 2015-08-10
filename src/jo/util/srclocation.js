import 'term'

type SrcLocation = {
  filename:string;
  code:string;
  range:int[]; // start, end
  startLine:int;
  startColumn:int;
  endLine:int;
  endColumn:int;
};


function SrcLocation(node:ASTNode, file?:SrcFile) {
  let filename = file ? (file.pkg ? file.pkg.id+'/'+file.name
                                  : file.relpath) : null;
  return Object.create(SrcLocation.prototype, {
    filename:    {value: filename, enumerable:true},
    code:        {value: file ? file.code : null, enumerable:true},
    range:       {
      value: (node && node.start !== undefined) ? [node.start,node.end] : [0,0],
      enumerable:true
    },
    startLine:   {value: (node && node.loc) ? node.loc.start.line : undefined, enumerable:true},
    startColumn: {value: (node && node.loc) ? node.loc.start.column : undefined, enumerable:true},
    endLine:     {value: (node && node.loc) ? node.loc.end.line : undefined, enumerable:true},
    endColumn:   {value: (node && node.loc) ? node.loc.end.column : undefined, enumerable:true},
  });
}

function SrcLocationWithProps({
  filename, //:string,
  code, //:SrcCodeData,
  range, //:int[2],
  startLine, //:int,
  startColumn, //:int,
  endLine, //:int,
  endColumn, //:int
}) {
  return Object.create(SrcLocation.prototype, {
    filename:    {value: filename, enumerable:true},
    code:        {value: code, enumerable:true},
    range:       {value: range || [0,0], enumerable:true},
    startLine:   {value: startLine, enumerable:true},
    startColumn: {value: startColumn, enumerable:true},
    endLine:     {value: endLine, enumerable:true},
    endColumn:   {value: endColumn, enumerable:true},
  });
}


var kSpaces    = '                                                                             '+
                 '                                                                             ';
var kCaretExts = '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~'+
                 '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~';
function fill(length, fillstr) { return fillstr.substr(0, length); }
function rfill(s, length, fillstr) { return s + fill(length - s.length, fillstr || kSpaces); }
function lfill(s, length, fillstr) { return fill(length - s.length, fillstr || kSpaces) + s; }


function findSourceIndent(lines, B, A) {
  //ASSERT(B+A < lines.length);
  var i, m, b = B, a = B, line;
  // line# | test order | description
  //     1 |     3      | B-2
  //     2 |     1      | B-1
  //     3 |     5      | B (focus-line)
  //     4 |     2      | B+1
  //     5 |     4      | B+2
  for (i = 0; i !== B+A; ++i) {
    line = (i % 2 === 0) ? lines[--b] : lines[++a];
    if ((m = line.match(/[^\s]/)) !== null) {
      return m.index;
    }
  }
  // focus-line or fallback
  return ((m = lines[B].match(/[^\s]/)) !== null) ? m.index : 0;
}

// var assert = require('assert').strictEqual;
// assert(findSourceIndent(' a\n  b\n   c\n    d\n     e'.split('\n'), 2, 2), 2); // b
// assert(findSourceIndent(' a\n   \n   c\n    d\n     e'.split('\n'), 2, 2), 4); // d
// assert(findSourceIndent(' a\n   \n   c\n     \n     e'.split('\n'), 2, 2), 1); // a
// assert(findSourceIndent('  \n   \n   c\n     \n     e'.split('\n'), 2, 2), 5); // e
// assert(findSourceIndent('  \n   \n   c\n     \n      '.split('\n'), 2, 2), 3); // c
// assert(findSourceIndent('  \n   \n    \n     \n      '.split('\n'), 2, 2), 0); // -
// process.exit(0);


function abbreviateSourceLines(lines, maxlines, startLineno) {
  if (lines.length <= maxlines) {
    return lines.map(function (line, i) {
      return {code:line, no:startLineno+i};
    });
  }
  var endLineno = startLineno + lines.length;
  var S = term.StderrStyle;
  var B = Math.ceil(maxlines/2);
  var A = Math.floor(maxlines/2);
  // cut away lines after first+B and before last-A
  var indentLevel = findSourceIndent(lines, B, A);
  var reducedLines = lines.slice(0, B).map(function(line, i) {
    return {code:line, no:startLineno+i};
  });
  reducedLines.push({
    code:fill(indentLevel, kSpaces) + S.grey('...'), no:0,
  });
  reducedLines = reducedLines.concat(lines.slice(lines.length-A).map(function(line, i) {
    return {code:line, no:endLineno-(A-i)};
  }));
  return reducedLines;
}


function limitLineLength(line, maxlen, suffix) {
  // ("fooooo",6,"...")  -> "fooooo"
  // ("foooooo",6,"...") -> "foo..."
  var S = term.StderrStyle;
  return (line.length <= maxlen) ? line : line.substr(0, maxlen-suffix.length) + S.grey(suffix);
}


SrcLocation.prototype.formatFilename = function(caretColor='white') {
  var S = term.StderrStyle;
  var msg = (this.filename ? S.bold(S[caretColor](this.filename)) : '');
  var lc = this.formatLineColumn();
  return (msg !== '') ? (msg + S.grey(':') + lc) : lc;
}


SrcLocation.prototype.formatLineColumn = function() {
  return (this.startLine !== undefined) ?
    term.StderrStyle.grey(
      this.startLine + ((this.startColumn !== undefined) ? ':' + this.startColumn : '')
    )
    : '';
}


// format(caretColor:string, linesB:int=2, linesA:int=0):string[]
SrcLocation.prototype.formatCode = function(caretColor='white', linesB=2, linesA=0) {
  var S = term.StderrStyle, code = this.code;
  var i, n, start, end;
  var maxLineLen = 100, lineLimitSuffix = '...';
  var lineNoFillz = String(this.endLine+linesA).length;
  var caret = ' '+S.bold(S[caretColor]('→'))+'  ', caretSpace = '    ';
  caretColor = S[caretColor];

  var fmtline = function(caret, color, lineno, srcline, hintCaretEndPos){
    lineno = lfill((lineno > 0 ? ''+lineno : ''), lineNoFillz);
    var maxlen = Math.max(hintCaretEndPos ? hintCaretEndPos+lineLimitSuffix.length : 0, maxLineLen);
    srcline = limitLineLength(srcline, maxlen, lineLimitSuffix);
    return caret + S[color]( lineno + '  ' + S.bold(srcline) );
  };

  var ctxline = (function(lineno, start, end) {
    var srcline = code.substring(
      (start === -1) ? 0 : start+1,
      (end === -1) ? code.length : end
    );
    return fmtline(caretSpace, 'grey', lineno, srcline);
  }).bind(this);

  var lines = [];

  // find interesting-line(s) range with full lines
  var errLineStart = code.lastIndexOf('\n', this.range[0]);
  var errLineEnd   = code.indexOf('\n', this.range[1]);

  // context lines before/above
  if (linesB !== 0) {
    start = errLineStart;
    for (i = 0; i !== linesB && start !== -1; ++i) {
      end   = start;
      start = code.lastIndexOf('\n', end-1);
      lines[linesB - i - 1] = ctxline(this.startLine-i-1, start, end);
    }
    lines = lines.filter(function(line) { return !!line; });
  }

  // interesting line(s)
  var interestingLines = code.substring(
    (errLineStart === -1) ? 0 : errLineStart+1,
    (errLineEnd === -1) ? code.length : errLineEnd ).split('\n');
  var m, indentLevel;
  if (interestingLines.length > 1) {
    abbreviateSourceLines(interestingLines, 4, this.startLine).forEach(function (line, i) {
      if (i === 0) {
        lines.push(fmtline( caret, 'boldWhite', line.no, line.code ));
      } else {
        lines.push(fmtline( caretSpace, 'white', line.no, line.code ));
      }
    });
  } else {
    lines.push(fmtline( caret, 'white', this.startLine, interestingLines[0], this.endColumn ));

    // column caret
    if (this.startColumn !== 0 || this.startColumn !== this.endColumn) {
      var caret = '      '+fill(lineNoFillz, kSpaces) +
                  S.bold(caretColor(lfill('^', this.startColumn+1)));
      if (this.endColumn-1 > this.startColumn) {
        caret += S.bold(caretColor(fill(this.endColumn-1 - this.startColumn, kCaretExts)));
      }
      lines.push(caret);
    }
  }

  // context lines after/below
  end = errLineEnd;
  for (i = 0; i !== linesA && start !== -1; ++i) {
    start = end;
    end   = code.indexOf('\n', start+1);
    lines.push(ctxline(this.startLine+i+1, start, end));
  }

  return lines;
}
