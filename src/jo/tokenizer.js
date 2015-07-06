function Tokenizer(code) {
  var offs = 0;
  var line = 1;
  var lineStartOffs = 0;

  var c;
  var stack = [];

  var prevToken = null;
  var token = null;
  var startToken = function(type, offset) {
    offset = offs + (offset || 0);
    return token = {
      type: type,
      loc:  {start:{line:line, column:offset-lineStartOffs}},
      range: [offset, -1],
    }
  };
  var endToken = function(value, offset) {
    offset = offs + (offset || 0);
    token.value = value === undefined ? null : value;
    token.loc.end = {line:line, column:offset-lineStartOffs};
    token.range[1] = offset;
    // token.raw = code.substring(token.range[0], token.range[1]);
    var tok = token;
    token = null;
    if (prevToken) {
      prevToken.next = tok;
    }
    tok.prev = prevToken;
    prevToken = tok;
    return tok;
  };

  var countLine = function() {
    ++line;
    lineStartOffs = offs;
  }

  var readStringLiteral = function(type) {
    startToken(type);
    let inEscape = false, value = '';
    while (offs < code.length) {
      switch(c = code[++offs]) {
        case '\\': {
          if (inEscape) {
            value += c;
            inEscape = false;
          } else {
            inEscape = true;
          }
          break;
        }
        case type: {
          if (inEscape) {
            value += c;
            inEscape = false;
          } else {
            return endToken(value, 1);
          }
        }
        case '\n': {
          throw new Error('linebreak inside string literal');
        }
        default: {
          if (inEscape) {
            inEscape = false;
            // Here we could validate the escape sequence, e.g. c in escapeables?
          }
          value += c;
        }
      }
    }
    throw new Error('unterminated string literal');
  };

  var readMagicStringLiteral = function*() {
    stack.push('`');
    startToken('mstring');
    loop: while (offs < code.length) {
      switch(c = code[++offs]) {
        case '{': {
          if (code[offs-1] === '$') {
            if (token.type === 'mstring') {
              token.type = 'mstring-start';
            }
            yield endToken(null, -1);
            startToken('mstring-codeblock-start', -1);
            yield endToken(null, 1);
            ++offs;
            let t, g = readProgram();
            while (!(t = g.next()).done) {
              yield t.value;
            }
            startToken('mstring-codeblock-end');
            yield endToken(null, 1);
            startToken('mstring-cont', 1);
          }
          break;
        }
        case '`': {
          // Note: mstrings can't contain "`" (no escape sequence)
          let sc = stack.pop();
          if (sc !== '`') {
            throw new Error('unexpected '+c+' in multi-line string literal');
          }
          if (token.type === 'mstring-cont') {
            token.type = 'mstring-end';
          }
          yield endToken(null, 1);
          return;
        }
      }
    }
    throw new Error('unterminated string literal');
  }

  var readWhitespace = function() {
    startToken('whitespace');
    loop: while (offs < code.length) {
      switch(c = code[++offs]) {
        case ' ': case '\t': case '\r': {
          break;
        }
        default: {
          break loop;
        }
      }
    }
    --offs;
    return endToken(null, 1);
  };

  var readLineComment = function() {
    startToken('comment-line');
    while (offs < code.length) {
      if (code[++offs] === '\n') {
        --offs;
        return endToken(null, 1);
      }
    }
    return endToken();
  }

  var readBlockComment = function() {
    startToken('comment-block');
    while (offs < code.length) {
      switch (code[++offs]) {
        case '/': {
          if (code[offs-1] === '*') {
            return endToken(null, +1);
          }
          break;
        }
        case '\n': {
          countLine();
          break;
        }
      }
    }
    throw new Error('unterminated block comment');
  }

  var readFrontSlash = function() {
    var c = code[offs+1];
    if (c === '/') {
      return readLineComment();
    } else if (c === '*') {
      return readBlockComment();
    }
    startToken('/');
    return endToken();
  }

  var readSomething = function() {
    startToken(c);
    loop: while (offs < code.length) {
      switch (c = code[++offs]) {
        case ' ': case '\t': case '\r': case '\n':
        case ';': case '.': case ':': case "'": case '"': case '`':
        case '{': case '}': case '[': case ']':
        case '(': case ')':
        case '/': case '*': case '-': case '+': case '&': case '^':
        case '#': case '%': case '!': case '?': case '<': case '>':
        case '=': {
          break loop;
        }
        default: {
          token.type += c;
        }
      }
    }
    --offs;
    return endToken(null, 1);
  }

  var popStack = function(c, expectC) {
    if (stack.length === 0) {
      throw new Error('unexpected '+c);
    }
    if (stack[stack.length-1] === expectC) {
      stack.pop();
      startToken(c);
      return endToken(null, 1);
    }
    return null;
  }

  var readProgram = function*() {
    loop: while (offs < code.length) {
      switch (c = code[offs]) {

        case ' ': case '\t': case '\r': {
          yield readWhitespace();
          break;
        }

        case '/': {
          yield readFrontSlash();
          break;
        }

        case '\n': {
          countLine();
          startToken('line');
          yield endToken(null, 1);
          break;
        }

        case '"': case "'": {
          yield readStringLiteral(c);
          break;
        }

        case '`': {
          let t, g = readMagicStringLiteral();
          while (!(t = g.next()).done) {
            yield t.value;
          }
          break;
        }

        case '{': case '[': case '(': {
          stack.push(c);
          startToken(c);
          yield endToken(null, 1);
          break;
        }

        case '}': {
          let t = popStack(c, '{');
          if (!t) { break loop; }
          yield t;
          break;
        }
        case ']': {
          let t = popStack(c, '[');
          if (!t) { break loop; }
          yield t;
          break;
        }
        case ')': {
          let t = popStack(c, '(');
          if (!t) { break loop; }
          yield t;
          break;
        }

        case ';': case '.': case ':':
        case '*': case '^':
        case '#': case '%': case '!': case '?':
        // these really should be variable in meaning:
        case '-': case '+':
        case '&': case '<': case '>': case '=': {
          startToken(c);
          yield endToken(null, 1);
          break;
        }

        default: {
          yield readSomething();
          break;
        }
      }
      ++offs;
    }

    if (token) {
      yield endToken();
    }
  };

  return readProgram();
}