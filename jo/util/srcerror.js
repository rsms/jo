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
    msg += srcloc.formatFilename(caretColor) + ' '
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


function srclocForError(err) {
  return err.srcloc || SrcLocation({
    filename:    (err.file ? err.file.name : err.filename),
    code:        (err.file ? err.file.code : err.sourceCode),
    range:       [err.index, err.index],
    startLine:   err.lineNumber,
    startColumn: err.column-1,
    endLine:     err.lineNumber,
    endColumn:   err.column-1,
  });
}


function styleCodeQuotes(s) {
  var S = TermStyle.stdout;
  return S.enabled ? S.bold(s.replace(/`([^`]*)`/g, (_, m) => S.cyan(m) ))
                   : s;
}

function formatSuggestion(suggestion:string, indent:string) {
  return indent + styleCodeQuotes(suggestion.replace(/\n/mg, indent)) + '\n';
}


SrcError.format = function(err, linesB, linesA) {
  var srcloc = srclocForError(err);

  var message = SrcError.formatSource(
    srcloc,
    err._message || err.message,
    err.name,
    'red',
    linesB,
    linesA
  );

  let suggestion = err.suggestion || err.fixSuggestion;
  if (suggestion) {
    message += formatSuggestion(suggestion, '\n  ');
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
      let suggestion = related.suggestion || related.fixSuggestion;
      if (suggestion) {
        message += formatSuggestion(suggestion, '\n    ');
      }
      hasFirstSrcLocMsg = true;
    });
  }

  return message;
}


SrcError.makeDiagnostics = function(err) {
  var srcloc;
  try {
    srcloc = srclocForError(err);
  } catch (e) {
    return [];
  }

  return [
    {
      srcloc:  srcloc,
      message: err._message || err.message,
      fixit:   err.fixSuggestion,
    },
  ];
}

