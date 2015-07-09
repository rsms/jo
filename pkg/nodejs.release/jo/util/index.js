//#jopkg{"files":["jsidentifier.js","levenshtein.js","parseopt.js","repr.js","srcerror.js","srclocation.js","termstyle.js","unique.js"],"imports":["util","path"],"exports":["RE","JSIdentifier","LevenshteinDistance","ParseOpt","repr","SrcError","SrcErrors","SrcLocation","Unique","SupportedTerms","TermStyle"],"babel-runtime":["core-js"],"version":"ibvq2pvi"}
var _core = __$irt("babel-runtime/core-js")
  , _repr_js$inspect = __$i(require("util")).inspect
  , _parseopt_js$path = __$i(require("path"));
"use strict";

function Unique(a) {
  var b = [],
      c,
      i = a.length;
  while (i--) {
    c = a[i];
    if (b.indexOf(c) === -1) {
      b.push(c);
    }
  }
  return b;
}
"use strict";

var SupportedTerms = ["xterm", "xterm-color", "screen", "vt100", "vt100-color", "xterm-256color"];

var style = {
  bold: ["1", "22"],
  italic: ["3", "23"],
  underline: ["4", "24"],
  inverse: ["7", "27"],

  white: ["37", "39"],
  grey: ["90", "39"],
  black: ["30", "39"],
  blue: ["34", "39"],
  cyan: ["36", "39"],
  green: ["32", "39"],
  magenta: ["35", "39"],
  red: ["31", "39"],
  yellow: ["33", "39"],

  boldWhite: ["1;37", "0;39"],
  boldGrey: ["1;90", "0;39"],
  boldBlack: ["1;30", "0;39"],
  boldBlue: ["1;34", "0;39"],
  boldCyan: ["1;36", "0;39"],
  boldGreen: ["1;32", "0;39"],
  boldMagenta: ["1;35", "0;39"],
  boldRed: ["1;31", "0;39"],
  boldYellow: ["1;33", "0;39"],

  italicWhite: ["3;37", "0;39"],
  italicGrey: ["3;90", "0;39"],
  italicBlack: ["3;30", "0;39"],
  italicBlue: ["3;34", "0;39"],
  italicCyan: ["3;36", "0;39"],
  italicGreen: ["3;32", "0;39"],
  italicMagenta: ["3;35", "0;39"],
  italicRed: ["3;31", "0;39"],
  italicYellow: ["3;33", "0;39"] };

function mklazyprop(propname, wstream) {
  var mkobj = function mkobj() {
    var obj = {};
    if (obj.enabled = wstream.isTTY) {
      _core.Object.keys(style).forEach(function (k) {
        var open = "\u001b[" + style[k][0] + "m",
            close = "\u001b[" + style[k][1] + "m";
        obj[k] = function (s) {
          return open + s + close;
        };
        obj[k].open = open;
        obj[k].close = close;
      });

      var seqNext = 0,
          seq = [["31", "39"], ["33", "39"], ["32", "39"], ["34", "39"]];

      obj.color = function (s) {
        return "\u001b[" + seq[seqNext % seq.length][0] + "m" + s + "\u001b[" + seq[seqNext++ % seq.length][1] + "m";
      };
    } else {
      obj.color = function (s) {
        return s;
      };
      _core.Object.keys(style).forEach(function (k) {
        obj[k] = obj.color;
      });
    }
    return obj;
  };
  return { enumerable: true, configurable: true, get: function get() {
      var obj = mkobj();
      Object.defineProperty(this, propname, { enumerable: true, value: obj });
      return obj;
    } };
}

var TermStyle = Object.create(null, {
  stdout: mklazyprop("stdout", process.stdout),
  stderr: mklazyprop("stderr", process.stderr) });
"use strict";

function SrcLocation(props) {
  if (arguments.length === 2) {
    var node = arguments[0],
        file = arguments[1];
    var filename = null;
    if (file) {
      if (file.pkg) {
        filename = file.pkg.id + "/" + file.name;
      } else {
        filename = file.relpath;
      }
    }
    return Object.create(SrcLocation.prototype, {
      filename: { value: filename, enumerable: true },
      code: { value: file ? file.code : null, enumerable: true },
      range: { value: node && Array.isArray(node.range) ? node.range : [0, 0], enumerable: true },
      startLine: { value: node && node.loc ? node.loc.start.line : undefined, enumerable: true },
      startColumn: { value: node && node.loc ? node.loc.start.column : undefined, enumerable: true },
      endLine: { value: node && node.loc ? node.loc.end.line : undefined, enumerable: true },
      endColumn: { value: node && node.loc ? node.loc.end.column : undefined, enumerable: true } });
  } else {
    return Object.create(SrcLocation.prototype, {
      filename: { value: props.filename, enumerable: true },
      code: { value: props.code, enumerable: true },
      range: { value: Array.isArray(props.range) ? props.range : [0, 0], enumerable: true },
      startLine: { value: props.startLine, enumerable: true },
      startColumn: { value: props.startColumn, enumerable: true },
      endLine: { value: props.endLine, enumerable: true },
      endColumn: { value: props.endColumn, enumerable: true } });
  }
}

var kSpaces = "                                                                             " + "                                                                             ";
var kCaretExts = "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~" + "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~";
function fill(length, fillstr) {
  return fillstr.substr(0, length);
}
function rfill(s, length, fillstr) {
  return s + fill(length - s.length, fillstr || kSpaces);
}
function lfill(s, length, fillstr) {
  return fill(length - s.length, fillstr || kSpaces) + s;
}

function findSourceIndent(lines, B, A) {
  var i,
      m,
      b = B,
      a = B,
      line;

  for (i = 0; i !== B + A; ++i) {
    line = i % 2 === 0 ? lines[--b] : lines[++a];
    if ((m = line.match(/[^\s]/)) !== null) {
      return m.index;
    }
  }

  return (m = lines[B].match(/[^\s]/)) !== null ? m.index : 0;
}

function abbreviateSourceLines(lines, maxlines, startLineno) {
  if (lines.length <= maxlines) {
    return lines.map(function (line, i) {
      return { code: line, no: startLineno + i };
    });
  }
  var endLineno = startLineno + lines.length;
  var S = TermStyle.stdout;
  var B = Math.ceil(maxlines / 2);
  var A = Math.floor(maxlines / 2);

  var indentLevel = findSourceIndent(lines, B, A);
  var reducedLines = lines.slice(0, B).map(function (line, i) {
    return { code: line, no: startLineno + i };
  });
  reducedLines.push({
    code: fill(indentLevel, kSpaces) + S.grey("..."), no: 0 });
  reducedLines = reducedLines.concat(lines.slice(lines.length - A).map(function (line, i) {
    return { code: line, no: endLineno - (A - i) };
  }));
  return reducedLines;
}

function limitLineLength(line, maxlen, suffix) {
  var S = TermStyle.stdout;
  return line.length <= maxlen ? line : line.substr(0, maxlen - suffix.length) + S.grey(suffix);
}

SrcLocation.prototype.formatFilename = function (caretColor) {
  var S = TermStyle.stdout;
  var msg = this.filename ? S.bold(S[caretColor](this.filename)) : "";
  var lc = this.formatLineColumn();
  return msg !== "" ? msg + S.grey(":") + lc : lc;
};

SrcLocation.prototype.formatLineColumn = function () {
  return this.startLine !== undefined ? TermStyle.stdout.grey(this.startLine + (this.startColumn !== undefined ? ":" + this.startColumn : "")) : "";
};

SrcLocation.prototype.formatCode = function () {
  var caretColor = arguments[0] === undefined ? "white" : arguments[0];
  var linesB = arguments[1] === undefined ? 2 : arguments[1];
  var linesA = arguments[2] === undefined ? 0 : arguments[2];

  var S = TermStyle.stdout,
      code = this.code;
  var i, n, start, end;
  var maxLineLen = 100,
      lineLimitSuffix = "...";
  var lineNoFillz = String(this.endLine + linesA).length;
  var caret = " " + S.bold(S[caretColor]("→")) + "  ",
      caretSpace = "    ";
  caretColor = S[caretColor];

  var fmtline = function fmtline(caret, color, lineno, srcline, hintCaretEndPos) {
    lineno = lfill(lineno > 0 ? "" + lineno : "", lineNoFillz);
    var maxlen = Math.max(hintCaretEndPos ? hintCaretEndPos + lineLimitSuffix.length : 0, maxLineLen);
    srcline = limitLineLength(srcline, maxlen, lineLimitSuffix);
    return caret + S[color](lineno + "  " + S.bold(srcline));
  };

  var ctxline = (function (lineno, start, end) {
    var srcline = code.substring(start === -1 ? 0 : start + 1, end === -1 ? code.length : end);
    return fmtline(caretSpace, "grey", lineno, srcline);
  }).bind(this);

  var lines = [];

  var errLineStart = code.lastIndexOf("\n", this.range[0]);
  var errLineEnd = code.indexOf("\n", this.range[1]);

  if (linesB !== 0) {
    start = errLineStart;
    for (i = 0; i !== linesB && start !== -1; ++i) {
      end = start;
      start = code.lastIndexOf("\n", end - 1);
      lines[linesB - i - 1] = ctxline(this.startLine - i - 1, start, end);
    }
    lines = lines.filter(function (line) {
      return !!line;
    });
  }

  var interestingLines = code.substring(errLineStart === -1 ? 0 : errLineStart + 1, errLineEnd === -1 ? code.length : errLineEnd).split("\n");
  var m, indentLevel;
  if (interestingLines.length > 1) {
    abbreviateSourceLines(interestingLines, 4, this.startLine).forEach(function (line, i) {
      if (i === 0) {
        lines.push(fmtline(caret, "boldWhite", line.no, line.code));
      } else {
        lines.push(fmtline(caretSpace, "white", line.no, line.code));
      }
    });
  } else {
    lines.push(fmtline(caret, "white", this.startLine, interestingLines[0], this.endColumn));

    if (this.startColumn !== 0 || this.startColumn !== this.endColumn) {
      var caret = "      " + fill(lineNoFillz, kSpaces) + S.bold(caretColor(lfill("^", this.startColumn + 1)));
      if (this.endColumn - 1 > this.startColumn) {
        caret += S.bold(caretColor(fill(this.endColumn - 1 - this.startColumn, kCaretExts)));
      }
      lines.push(caret);
    }
  }

  end = errLineEnd;
  for (i = 0; i !== linesA && start !== -1; ++i) {
    start = end;
    end = code.indexOf("\n", start + 1);
    lines.push(ctxline(this.startLine + i + 1, start, end));
  }

  return lines;
};
"use strict";

var util = require("util");

function SrcError(name, srcloc, message, suggestion, related) {
  if (!(this instanceof SrcError)) {
    return new SrcError(name, srcloc, message, suggestion, related);
  }
  Error.call(this, message);
  Error.captureStackTrace(this, SrcError);

  this.name = name;
  this.message = message;
  this._message = message;
  this.srcloc = srcloc;
  this.suggestion = suggestion;
  this.related = related;
}

function SrcErrors(errors) {
  return Object.create(SrcErrors.prototype, {
    errors: { value: errors, enumerable: true } });
}

util.inherits(SrcError, Error);

SrcError.canFormat = function (err) {
  return err instanceof SrcError || err instanceof SrcErrors || err.lineNumber !== undefined && err.column !== undefined && err.index !== undefined;
};

SrcError.formatSource = function (srcloc, message, errname, caretColor, linesB, linesA, indent) {
  var S = TermStyle.stdout;
  if (!indent) indent = "";
  var msg = indent;
  if (srcloc && srcloc.filename) {
    msg += srcloc.formatFilename(caretColor) + " ";
  }
  msg += S.bold(message);
  if (errname) {
    msg += " " + S.grey("(" + errname + ")");
  }
  if (srcloc.code && srcloc.startLine !== undefined) {
    msg += "\n" + indent + srcloc.formatCode(caretColor, linesB, linesA).join("\n" + indent);
  }
  return msg;
};

function srclocForError(err) {
  return err.srcloc || SrcLocation({
    filename: err.file ? err.file.name : err.filename,
    code: err.file ? err.file.code : err.sourceCode,
    range: [err.index, err.index],
    startLine: err.lineNumber,
    startColumn: err.column - 1,
    endLine: err.lineNumber,
    endColumn: err.column - 1 });
}

function styleCodeQuotes(s) {
  var S = TermStyle.stdout;
  return S.enabled ? S.bold(s.replace(/`([^`]*)`/g, function (_, m) {
    return S.cyan(m);
  })) : s;
}

function formatSuggestion(suggestion, indent) {
  return indent + styleCodeQuotes(suggestion.replace(/\n/mg, indent)) + "\n";
}

SrcError.format = function (err, linesB, linesA) {
  if (err instanceof SrcErrors) {
    var v = [];
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = _core.$for.getIterator(err.errors), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var error = _step.value;

        v.push(SrcError.format(error));
      }
    } catch (err) {
      _didIteratorError = true;
      _iteratorError = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion && _iterator["return"]) {
          _iterator["return"]();
        }
      } finally {
        if (_didIteratorError) {
          throw _iteratorError;
        }
      }
    }

    return v.join("\n");
  }

  var srcloc = srclocForError(err);

  var message = SrcError.formatSource(srcloc, err._message || err.message, err.name, "red", linesB, linesA);

  var suggestion = err.suggestion || err.fixSuggestion;
  if (suggestion) {
    message += formatSuggestion(suggestion, "\n  ");
  }

  if (err.related) {
    (function () {
      var hasFirstSrcLocMsg = !!srcloc && srcloc.filename;
      err.related.forEach(function (related) {
        message += "\n" + SrcError.formatSource(related.srcloc, related.message, null, hasFirstSrcLocMsg ? "magenta" : "red", linesB, linesA, hasFirstSrcLocMsg ? "    " : null);
        var suggestion = related.suggestion || related.fixSuggestion;
        if (suggestion) {
          message += formatSuggestion(suggestion, "\n    ");
        }
        hasFirstSrcLocMsg = true;
      });
    })();
  }

  return message;
};

SrcError.makeDiagnostics = function (err) {
  var srcloc;
  try {
    srcloc = srclocForError(err);
  } catch (e) {
    return [];
  }

  return [{
    srcloc: srcloc,
    message: err._message || err.message,
    fixit: err.suggestion || err.fixSuggestion }];
};
"use strict";

function repr(obj) {
  var depth = arguments[1] === undefined ? 4 : arguments[1];
  var colors = arguments[2] === undefined ? true : arguments[2];

  return _repr_js$inspect(obj, { depth: depth, colors: colors });
}
"use strict";

function ParseOpt(opts, args, usage, prog, hiddenOpts) {
  var optdesc = {},
      nopts = 0,
      helpops = "help",
      opmaxlen = helpops.length;
  var optvals = {},
      hiddenOptDesc = {};
  var spaces = "                                                                 ";
  var opRE = /^(?:<([^>]+)>)?\s*(.+)\s*$/;

  _core.Object.keys(opts).forEach(function (op) {
    var m;
    if (opts[op]) {
      m = opRE.exec(opts[op]);
      optdesc[op] = { desc: m[2], val: m[1] };
    } else {
      optdesc[op] = { desc: "" };
    }
    opmaxlen = Math.max(opmaxlen, op.length + (optdesc[op].val ? (" <" + optdesc[op].val + ">").length : 0));
    ++nopts;
  });

  if (hiddenOpts) _core.Object.keys(hiddenOpts).forEach(function (op) {
    var m;
    if (hiddenOpts[op]) {
      m = opRE.exec(hiddenOpts[op]);
      hiddenOptDesc[op] = { desc: m[2], val: m[1] };
    } else {
      hiddenOptDesc[op] = { desc: "" };
    }
  });

  var showusage = function showusage(error) {
    if (error) {
      if (typeof error === "string") {
        process.stderr.write(prog + ": " + error + ". See '" + prog + " -help'\n");
      } else {
        process.stderr.write(prog + ": " + (error.stack || String(error)) + "\n");
      }
    } else {
      var s = usage ? usage : nopts ? "{{prog}} [options] [arg...]\noptions:\n{{options}}\n" : "{{prog}} [arg...]\n",
          vars = {
        prog: prog,
        options: nopts ? "  " + ["-" + helpops + spaces.substr(0, opmaxlen - helpops.length) + "  Show help"].concat(_core.Object.keys(optdesc).map(function (op) {
          var s = op;
          if (optdesc[op].val) {
            s += "=<" + optdesc[op].val + ">";
          }
          return "-" + s + spaces.substr(0, opmaxlen - s.length) + (optdesc[op].desc ? "  " + optdesc[op].desc : "");
        })).join("\n  ") : ""
      };
      s = s.replace(/\{\{([^\}]+)\}\}/g, function (a, v) {
        return vars[v] || a;
      });
      process.stderr.write(s);
    }
    process.exit(error ? 2 : 0);
  };

  if (typeof usage === "function") {
    showusage = usage;
  }

  var i,
      a,
      v,
      arg,
      op,
      argRE = /^\-\-?([^\s=]+)(?:=(.+))?$/;

  for (i = 0; i !== args.length; ++i) {
    if (!(arg = args[i]) || !(a = argRE.exec(arg))) {
      break;
    }
    v = a[2];
    a = a[1];
    if (!optdesc[a] && a === "h" || a === "help") {
      return showusage();
    }
    op = optdesc[a] || hiddenOptDesc[a];
    if (!op) {
      return showusage("unknown option " + arg);
    }
    if (op.val) {
      if (v) {
        optvals[a] = v;
      } else if (!args[i + 1] || args[i + 1][0] === "-" || !(optvals[a] = args[++i])) {
        return showusage("missing <" + op.val + "> for " + arg);
      }
    } else {
      optvals[a] = true;
    }
  }

  args = args.slice(i);
  return [optvals, args, showusage];
}

ParseOpt.prog = function (argv) {
  var prog = process.env._;
  if (!prog) {
    prog = _parseopt_js$path.relative(process.cwd(), argv[0].indexOf("/node") === -1 ? argv[0] : argv[1]);
  }
  return [prog, argv.slice(2)];
};
"use strict";

function LevenshteinDistance(a, b) {
  if (a.length == 0) {
    return b.length;
  }
  if (b.length == 0) {
    return a.length;
  }

  var matrix = [];

  var i;
  for (i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  var j;
  for (j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (i = 1; i <= b.length; i++) {
    for (j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) == a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
      }
    }
  }

  return matrix[b.length][a.length];
}
"use strict";

var RE = /^(?!(?:do|if|in|for|let|new|try|var|case|else|enum|eval|null|this|true|void|with|break|catch|class|const|false|super|throw|while|yield|delete|export|import|public|return|static|switch|typeof|default|extends|finally|package|private|continue|debugger|function|arguments|interface|protected|implements|instanceof)$)[\x24A-Z\x5Fa-z\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u0527\u0531-\u0556\u0559\u0561-\u0587\u05D0-\u05EA\u05F0-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u08A0\u08A2-\u08AC\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0977\u0979-\u097F\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C33\u0C35-\u0C39\u0C3D\u0C58\u0C59\u0C60\u0C61\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D60\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F4\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F0\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1877\u1880-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191C\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19C1-\u19C7\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1CE9-\u1CEC\u1CEE-\u1CF1\u1CF5\u1CF6\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2E2F\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303C\u3041-\u3096\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FCC\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA697\uA6A0-\uA6EF\uA717-\uA71F\uA722-\uA788\uA78B-\uA78E\uA790-\uA793\uA7A0-\uA7AA\uA7F8-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA80-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uABC0-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC][\x240-9A-Z\x5Fa-z\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0300-\u0374\u0376\u0377\u037A-\u037D\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u0483-\u0487\u048A-\u0527\u0531-\u0556\u0559\u0561-\u0587\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u05D0-\u05EA\u05F0-\u05F2\u0610-\u061A\u0620-\u0669\u066E-\u06D3\u06D5-\u06DC\u06DF-\u06E8\u06EA-\u06FC\u06FF\u0710-\u074A\u074D-\u07B1\u07C0-\u07F5\u07FA\u0800-\u082D\u0840-\u085B\u08A0\u08A2-\u08AC\u08E4-\u08FE\u0900-\u0963\u0966-\u096F\u0971-\u0977\u0979-\u097F\u0981-\u0983\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BC-\u09C4\u09C7\u09C8\u09CB-\u09CE\u09D7\u09DC\u09DD\u09DF-\u09E3\u09E6-\u09F1\u0A01-\u0A03\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A59-\u0A5C\u0A5E\u0A66-\u0A75\u0A81-\u0A83\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABC-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AD0\u0AE0-\u0AE3\u0AE6-\u0AEF\u0B01-\u0B03\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3C-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B56\u0B57\u0B5C\u0B5D\u0B5F-\u0B63\u0B66-\u0B6F\u0B71\u0B82\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD0\u0BD7\u0BE6-\u0BEF\u0C01-\u0C03\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C33\u0C35-\u0C39\u0C3D-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C58\u0C59\u0C60-\u0C63\u0C66-\u0C6F\u0C82\u0C83\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBC-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CDE\u0CE0-\u0CE3\u0CE6-\u0CEF\u0CF1\u0CF2\u0D02\u0D03\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D-\u0D44\u0D46-\u0D48\u0D4A-\u0D4E\u0D57\u0D60-\u0D63\u0D66-\u0D6F\u0D7A-\u0D7F\u0D82\u0D83\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DF2\u0DF3\u0E01-\u0E3A\u0E40-\u0E4E\u0E50-\u0E59\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB9\u0EBB-\u0EBD\u0EC0-\u0EC4\u0EC6\u0EC8-\u0ECD\u0ED0-\u0ED9\u0EDC-\u0EDF\u0F00\u0F18\u0F19\u0F20-\u0F29\u0F35\u0F37\u0F39\u0F3E-\u0F47\u0F49-\u0F6C\u0F71-\u0F84\u0F86-\u0F97\u0F99-\u0FBC\u0FC6\u1000-\u1049\u1050-\u109D\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u135D-\u135F\u1380-\u138F\u13A0-\u13F4\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F0\u1700-\u170C\u170E-\u1714\u1720-\u1734\u1740-\u1753\u1760-\u176C\u176E-\u1770\u1772\u1773\u1780-\u17D3\u17D7\u17DC\u17DD\u17E0-\u17E9\u180B-\u180D\u1810-\u1819\u1820-\u1877\u1880-\u18AA\u18B0-\u18F5\u1900-\u191C\u1920-\u192B\u1930-\u193B\u1946-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u19D0-\u19D9\u1A00-\u1A1B\u1A20-\u1A5E\u1A60-\u1A7C\u1A7F-\u1A89\u1A90-\u1A99\u1AA7\u1B00-\u1B4B\u1B50-\u1B59\u1B6B-\u1B73\u1B80-\u1BF3\u1C00-\u1C37\u1C40-\u1C49\u1C4D-\u1C7D\u1CD0-\u1CD2\u1CD4-\u1CF6\u1D00-\u1DE6\u1DFC-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u200C\u200D\u203F\u2040\u2054\u2071\u207F\u2090-\u209C\u20D0-\u20DC\u20E1\u20E5-\u20F0\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D7F-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2DE0-\u2DFF\u2E2F\u3005-\u3007\u3021-\u302F\u3031-\u3035\u3038-\u303C\u3041-\u3096\u3099\u309A\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FCC\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA62B\uA640-\uA66F\uA674-\uA67D\uA67F-\uA697\uA69F-\uA6F1\uA717-\uA71F\uA722-\uA788\uA78B-\uA78E\uA790-\uA793\uA7A0-\uA7AA\uA7F8-\uA827\uA840-\uA873\uA880-\uA8C4\uA8D0-\uA8D9\uA8E0-\uA8F7\uA8FB\uA900-\uA92D\uA930-\uA953\uA960-\uA97C\uA980-\uA9C0\uA9CF-\uA9D9\uAA00-\uAA36\uAA40-\uAA4D\uAA50-\uAA59\uAA60-\uAA76\uAA7A\uAA7B\uAA80-\uAAC2\uAADB-\uAADD\uAAE0-\uAAEF\uAAF2-\uAAF6\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uABC0-\uABEA\uABEC\uABED\uABF0-\uABF9\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE00-\uFE0F\uFE20-\uFE26\uFE33\uFE34\uFE4D-\uFE4F\uFE70-\uFE74\uFE76-\uFEFC\uFF10-\uFF19\uFF21-\uFF3A\uFF3F\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]*$/;

var JSIdentifier = {
  isValid: function isValid(name) {
    return name.match(RE);
  },

  fromString: function fromString(s) {
    s = s.replace(/^.*[\/\-]([^\/\-]+)$/, "$1").split(/\.+/);
    return s.length === 1 ? s[0] : s[s.length - 2];
  } };
exports.RE = RE;
exports.JSIdentifier = JSIdentifier;
exports.LevenshteinDistance = LevenshteinDistance;
exports.ParseOpt = ParseOpt;
exports.repr = repr;
exports.SrcError = SrcError;
exports.SrcErrors = SrcErrors;
exports.SrcLocation = SrcLocation;
exports.Unique = Unique;
exports.SupportedTerms = SupportedTerms;
exports.TermStyle = TermStyle;
//#sourceMappingURL=index.js.map
