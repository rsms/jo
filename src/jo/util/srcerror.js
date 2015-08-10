import 'util'
import 'term'

function SrcError(name, srcloc, message, suggestion, related) {
  if (!(this instanceof SrcError)) {
    return new SrcError(name, srcloc, message, suggestion, related);
  }
  Error.call(this, message);
  Error.captureStackTrace(this, SrcError);
  // this.stack = (new Error()).stack;
  this.name          = name;
  this.message       = message;
  this._message      = message;
  this.srcloc        = srcloc;
  this.suggestion    = suggestion;
  this.related       = related;
  // esprima compat:
  // this.index         = node.range ? node.range[0] : -1;
  // this.lineNumber    = node.loc.start.line;
  // this.column        = node.loc.start.column;
}

// SrcError.prototype = new Error;
util.inherits(SrcError, Error);


function SrcErrors(errors) {
  return Object.create(SrcErrors.prototype, {
    errors: {value:errors, enumerable:true},
  }); 
}


function RefError(file, node, message, related) {
  return SrcError('RefError', SrcLocation(node, file), message, null, related);
}

function ImportError(file, node, message, fixSuggestion, related) {
  return SrcError('ImportError', SrcLocation(node, file), message, fixSuggestion, related);
}

function ExportError(file, node, message, fixSuggestion, related) {
  return SrcError('ExportError', SrcLocation(node, file), message, fixSuggestion, related);
}

function SyntaxError(file, node, message, fixSuggestion, related) {
  return SrcError('SyntaxError', SrcLocation(node, file), message, fixSuggestion, related);
}

function CyclicRefError(pkg, name, fileA, fileB, deps, onlyClasses:bool) {
  let errs = [
    { message: `"${name}" defined here`,
      srcloc:  SrcLocation(fileB.definedIDs[name].identifier, fileB) }, // HERE
    { message: `"${name}" referenced here`,
      srcloc:  SrcLocation(fileA.unresolvedIDs[name].node, fileA) }
  ];
  deps.forEach(dep => {
    //if (!onlyClasses || dep.binding.path.type === 'ClassExpression') {
    errs = errs.concat([
      { message: `"${dep.name}" defined here`,
        srcloc:  SrcLocation(dep.binding.identifier, fileA) },
      { message: `"${dep.name}" referenced here`,
        srcloc:  SrcLocation(dep.refNode, fileB) },
    ]);
    //}
  });
  return RefError(
    null,
    null,
    `cyclic dependency between source files "${fileA.name}" and "${fileB.name}"`+
    ` in package "${pkg.id}"`,
    errs
  );
}

function styleCodeQuotes(s) {
  var S = term.StderrStyle;
  return S.enabled ? s.replace(/`([^`]*)`/g, (_, m) => S.cyan(m) ) : s;
}


SrcError.canFormat = function(err) {
  return err instanceof SrcError ||
         err instanceof SrcErrors ||
         (err.lineNumber !== undefined && err.column !== undefined && err.index !== undefined);
}


SrcError.formatSource = function(srcloc, message, errname, caretColor, linesB, linesA, indent) {
  var S = term.StderrStyle;
  if (!indent) indent = '';
  var msg = indent;
  if (srcloc && srcloc.filename) {
    msg += srcloc.formatFilename(caretColor) + ' '
  }
  msg += S.bold(styleCodeQuotes(message));
  if (errname) {
    msg += ' ' + S.grey('('+errname+')');
  }
  if (srcloc && srcloc.code && srcloc.startLine !== undefined) {
    msg += '\n' + indent + srcloc.formatCode(caretColor, linesB, linesA).join('\n'+indent);
  }
  return msg;
}


function srclocForError(err) {
  return err.srcloc || SrcLocationWithProps({
    filename:    (err.file ? err.file.name : err.filename),
    code:        (err.file ? err.file.code : err.sourceCode),
    range:       [err.index, err.index],
    startLine:   err.lineNumber,
    startColumn: err.column-1,
    endLine:     err.lineNumber,
    endColumn:   err.column-1,
  });
}


function formatSuggestion(suggestion:string, indent:string) {
  return indent +
         term.StderrStyle.bold(styleCodeQuotes(suggestion.replace(/\n/mg, indent))) +
         '\n';
}


SrcError.format = function(err, linesB, linesA) {
  // Multiple errors?
  if (err instanceof SrcErrors) {
    let v = [];
    for (let error of err.errors) {
      v.push(SrcError.format(error));
    }
    return v.join('\n');
  }

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

  //if (err.stack) { message += err.stack; }

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
      fixit:   err.suggestion || err.fixSuggestion,
    },
  ];
}

