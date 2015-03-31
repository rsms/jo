var util = require('util');

export function SrcError(name, srcloc, message, fixSuggestion, related) {
  if (!(this instanceof SrcError)) {
    return new SrcError(name, srcloc, message, fixSuggestion, related);
  }
  Error.call(this, message);
  Error.captureStackTrace(this, SrcError);
  // this.stack = (new Error()).stack;
  this.name          = name;
  this.message       = message;
  this._message      = message;
  this.srcloc        = srcloc;
  this.fixSuggestion = fixSuggestion;
  this.related       = related;
  // esprima compat:
  // this.index         = node.range ? node.range[0] : -1;
  // this.lineNumber    = node.loc.start.line;
  // this.column        = node.loc.start.column;
}


// SrcError.prototype = new Error;
util.inherits(SrcError, Error);


SrcError.canFormat = function(err) {
  return err instanceof SrcError ||
         (err.lineNumber !== undefined && err.column !== undefined && err.index !== undefined);
}


SrcError.formatSource = function(srcloc, message, errname, caretColor, linesB, linesA, indent) {
  var S = TermStyle.stdout;
  if (!indent) indent = '';
  var msg = indent;
  if (srcloc && srcloc.filename) {
    msg += srcloc.formatFilename(caretColor) + ': '
  }
  msg += S.bold(message);
  if (errname) {
    msg += ' ' + S.grey('('+errname+')');
  }
  if (srcloc.code && srcloc.startLine !== undefined) {
    msg += '\n' + indent + srcloc.formatCode(caretColor, linesB, linesA).join('\n'+indent);
  }
  return msg;
}


SrcError.format = function(err, linesB, linesA) {
  var srcloc = err.srcloc || SrcLocation({
    filename:    (err.file ? err.file.name : err.filename),
    code:        (err.file ? err.file.code : err.sourceCode),
    range:       [err.index, err.index],
    startLine:   err.lineNumber,
    startColumn: err.column-1,
    endLine:     err.lineNumber,
    endColumn:   err.column-1,
  });

  var message = SrcError.formatSource(
    srcloc,
    err._message || err.message,
    err.name,
    'red',
    linesB,
    linesA
  );

  if (err.fixSuggestion) {
    var S = TermStyle.stdout;
    message += '\n  Suggestion: ' + S.bold(err.fixSuggestion.replace(/`([^`]*)`/g, function(_,m) {
      return S.enabled ? S.cyan(m) : '`'+m+'`';
    }))+'\n';
  }

  if (err.related) {
    let hasFirstSrcLocMsg = !!srcloc && srcloc.filename;
    err.related.forEach(function (related) {
      message += '\n' + SrcError.formatSource(
        related.srcloc,
        related.message,
        null,
        hasFirstSrcLocMsg ? 'magenta' : 'red',
        linesB,
        linesA,
        hasFirstSrcLocMsg ? '    ' : null);
      hasFirstSrcLocMsg = true;
    });
  }

  return message;
}

