// the following is only used for internal debugging
/*import {inspect} from 'util'

function repr(obj, depth, colors) {
  return inspect(obj, {depth:depth===undefined?4:depth, colors:colors===undefined?true:colors});
}

function fmttoks(tokens) {
  return tokens.map(fmttok).join(', ');
}

function fmtsrcline(source, p, label, noCaret) {
  var srcLineAt = function(source, p) {
    var top, lineno = 1, start = p, end = p;
    while (source[--start] !== '\n' && start !== -1) {}
    top = start;
    while (top !== -1) {
      if (source[top--] === '\n') {
        ++lineno;
      }
    }
    while (end < source.length) {
      if (source[end++] === '\n') {
        --end;
        break;
      }
    }
    if (end > source.length) {
      end = source.length;
    }
    return {
      offs:    p,
      endoffs: end,
      source:  source.substring(start+1, end),
      line:    lineno,
      column:  p - start,
    }
  }
  var nsp = function(n) {
    var s, sp = '                                          ';
    if (n <= sp.length) {
      return sp.substr(0, n);
    } else {
      s = '';
      while (n--) { s += ' ' }
      return s;
    }
  }
  var padL = function(n, s) {
    var s = String(s);
    return nsp(n-s.length) + s;
  }
  var caret = function(column, label) {
    var s = '^';
    if (label) { s += ' ' + label; }
    for (var n = column; --n;) { s = ' ' + s }
    return color('m', s);
  }
  var margin = 7;
  var m = srcLineAt(source, p), ch, endmark;
  if (label) {
    ch = m.source[m.column-1];
    endmark = (m.endoffs >= source.length ? '<EOF>' : '\\n');
    m.source = m.source.substr(0,m.column-1) +
               color('44;1;37', ch || endmark) +
               (m.source.substr(m.column) || (ch ? endmark : ''));
  }
  var s = color('90', padL(margin, m.line + ' | ')) + m.source;
  if (!noCaret) {
    s += '\n' + nsp(margin) + caret(m.column, (label ? (label + ': ' + color('g',m.offs)) : null));
  }
  return s;
}

if (__DEV__) {
  Map.prototype.inspect = function(depth, ctx) {
    // console.log(depth, ctx);
    var s = (ctx.colors ? color('m','Map{') : 'Map{');
    var pre = '                                                              '.substr(0,depth);
    pre = '\n' + pre;
    ++ctx.depth;
    for (var e of this) { s += pre + repr(e[0]) + ' -> ' + inspect(e[1],ctx); }
    --ctx.depth;
    if (s !== 'Map{') {
      s += ' ';
    }
    return s+(ctx.colors ? color('m','}') : '}');
  }
}

function fmtcallstack(offs, len, glue, lineprefix) {
  if (!offs) { offs = 2 } else { offs += 2; } // skip this callsite and first "message" line
  if (!len || len < 0) { len = 9000; }
  if (!lineprefix) { lineprefix = '  '; }
  return (new Error).stack.split(/\n/).slice(offs, offs+len).map(function(line, i) {
    var isself, filename, lineno = -1, builtin;
    line = lineprefix + line.trim().replace(/\(([^\)]+):(\d+):(\d+)\)$/, function (s, $1, $2, $3) {
      isself = ($1 === __filename);
      filename = $1;
      builtin = !isself && (!filename || filename.indexOf('/') === -1);
      lineno = parseInt($2);
      if ($1.indexOf(__dirname) === 0) { $1 = $1.substr(__dirname.length+1); }
      if (isself) { $1 = color('37',$1); } else { $1 = color('90',$1); }
      return color('90', '(') + $1 + color('90', ':' + $2 + ':' + $3 + ')');
    }).replace(/(at\s+)(.+)\.([^\.]+)(\s)/, function(m, $1, $2, $3, $4) {
      return 'at ' + color('1;37', $2) + '.' + color(isself ? 'g':builtin?'y':'c', $3) + $4;
    }).replace(/(at\s+)([^\.]+)(\s)/, function(m, $1, $2, $3) {
      return 'at ' + color(isself ? 'g':builtin?'y':'c', $2) + $3;
    });
    if (filename && filename.indexOf('/') !== -1) {
      try {
        line += '\n  ' + lineprefix + 
            color('90', require('fs').readFileSync(filename,'utf8').split(/\n/)[lineno-1].trim());
      } catch (e) {}
    }
    return line;
  }).join(glue || '\n');
}

function dumpPState(s) {
  var prevtokz = 10;
  console.log('  previous tokens: '+(s.tokens.length > prevtokz ? '... ':'') +
              s.tokens.slice(Math.max(0,s.tokens.length-prevtokz)).map(fmttok).join(' '))
  console.log('  next token: '+fmttok(s))
  console.log(fmtsrcline(s.input, s.start, 's.start'))
  console.log(fmtsrcline(s.input, s.end, 's.end'))
  console.log(fmtsrcline(s.input, s.pos, 's.pos'))
}

function fmtit(it) {
  var s;
  for (var v of it) { s = (s ? s + ', ' : '') + repr(v); }
  return s;
}
*/