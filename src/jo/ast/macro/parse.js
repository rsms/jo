
function parseTokens(p, behaviour, patternVars) {
  var depth
    , open
    , close
    , s = p.state
    , vars = null  // Map<string,Token>
    , startPos = s.start
    , openFirst = false
    , tokenStartIndex = s.tokens.length
    , tokenStartIndex1 = tokenStartIndex+1
    , needsNewToken = true
    , readToken = p.next.bind(p)
    , nextToken = readToken
    , skipToken = function(){ nextToken = readToken; }
    , parseMacroVar
    ;

  // var readToken2 = readToken;
  // readToken = function() { g_dbg_pstate = s.clone(); readToken2(); }

  parseMacroVar = function() {
    // enters with guarantee: s.value[0] === '$'

    // TODO: in body pattern, allow advanced spread of variables, like:
    //   macro { foo ...$a } -> { <... .bar($a)> }
    //   macro { list ...$a } -> { [<...$a,>] }
    //   foo 1 2 3
    //   list 1 2 3
    // result:
    //   .bar(1).bar(2).bar(3)
    //   [1,2,3]

    // TODO: Allow advanced rest var definitions:
    //   macro { foo(<...$a,>) } -> { <... .bar($a)> }
    //   foo(1,2,3)
    // result:
    //   .bar(1).bar(2).bar(3)
    //

    // TODO: Allow token type-tags in variable definitions:
    //   macro { str $a<:number> } -> { ($a).toString(16) }
    //   macro { str $a<:string> } -> { $a }
    //   macro { str $a } -> { String($a) }
    //   str 23
    //   str "23"
    //   str [2,3]
    // result:
    //   (23).toString(16)
    //   "23"
    //   String([2,3])
    //

    // console.log('parseMacroVar s.value='+repr(s.value));
    if (s.value.charCodeAt(1) === ccDollar) {
      // Escaped dollar-sign match
      // E.g. $$x -> {value:"$x", type:name}
      //console.log('parseMacroVar rewrite '+repr(s.value)+' to '+repr(s.value.substr(1)));
      s.value = s.value.substr(1);
      return;
    }
    // Macro variable
    // E.g. $x -> {value:"$x", type:name, [TokenVarTag]:TokenVar1|TokenVarN}
    var t, index = s.tokens.length;
    if (behaviour === kPattern) {
      if (vars) {
        if (vars.has(s.value)) {
          p.raise(s.start, 'Duplicate identifier "'+s.value+'" in macro pattern');
        }
      } else {
        vars = new Map;
      }
      nextToken(); nextToken = skipToken;
      t = s.tokens[index];
      if (index !== tokenStartIndex &&
          s.tokens[index-1].type === tokTypes.ellipsis) //< unreliable: ".../*comment*/$a"
      {
        // E.g. ...$x -> {value:"$x", type:name, [TokenVarTag]:TokenVarN}
        t[TokenVarTag] = TokenVarN;
        // Eat previous "..."
        s.tokens.splice(index-1, 1);
      } else {
        // E.g. $x -> {value:"$x", type:name, [TokenVarTag]:TokenVar1}
        t[TokenVarTag] = TokenVar1;
      }
      vars.set(t.value, t);
      //console.log('vars set t', t.value, vars)

    } else { // (behaviour === kBody)
      //console.log('parseMacroVar lookup s.value='+repr(s.value));
      var ptok = patternVars.get(s.value)
      if (ptok) {
        nextToken(); nextToken = skipToken;
        t = s.tokens[index];
        ptok[MatchingToken] = t;
        t[TokenVarTag] = TokenVar1;
        // t._MatchingToken = ptok; t._TokenVarTag = 'TokenVar1'; // debug
      }
    }
  }

  // find open & close token types, or parse single token
  //console.log('1st:', fmttok(s));
  switch (s.type) {
    case tokTypes.bracketL:     close = tokTypes.bracketR; break;
    case tokTypes.braceL:
    case tokTypes.dollarBraceL: close = tokTypes.braceR; break
    case tokTypes.parenL:       close = tokTypes.parenR; break;
    case tokTypes.eof: {
      if (behaviour === kPattern) {
        p.raise(startPos, 'Missing "->" in macro definition')
      } else {
        p.raise(startPos, 'Missing macro body')
      }
      break;
    }
    case tokTypes.name: if (s.value.charCodeAt(0) === ccDollar) { parseMacroVar(); } break;
  }

  if (close) {
    open = s.type;
    openFirst = true; // I.e. first token is a grouping "open+close"

  } else {
    nextToken();
    // Previous token was not open -- maybe the next is?
    // console.log('2nd:', fmttok(s));
    switch (s.type) {
      case tokTypes.bracketL:     open = s.type; close = tokTypes.bracketR; break;
      case tokTypes.braceL:
      case tokTypes.dollarBraceL: open = s.type; close = tokTypes.braceR; break
      case tokTypes.parenL:       open = s.type; close = tokTypes.parenR; break;
      case tokTypes.eof:          if (behaviour === kPattern) { p.unexpected(); } break;
    }
    // if (!close) { console.log('exit with single token'); }
  }

  if (close) {
    nextToken();
    depth = 1;
    loop2: while (1) {
      // console.log('nth:', fmttok(s));
      switch (s.type) {
        case open: ++depth; break;
        case close: {
          if (--depth === 0) {
            if (openFirst && close === tokTypes.braceR) {
              // The first token was "{" -- i.e. the pattern style is "{...}"
              // eat and ignore the current token:
              p.nextToken();
              // remove the first token "{":
              s.tokens.splice(tokenStartIndex,1)
            } else {
              // parse and include the current token
              var tokindex = s.tokens.length;
              nextToken();
              // console.log('tokindex: ['+tokindex+','+s.tokens.length+']')
            }
            break loop2;
          }
          break;
        }
        case tokTypes.name: if (s.value.charCodeAt(0) === ccDollar) { parseMacroVar(); } break;
        case tokTypes.eof: {
          if (behaviour === kPattern) {
            p.raise(startPos, 'Missing terminating "'+close.label+'" in macro pattern')
          } // else behaviour === kBody: valid to have a macro be the last thing of input
          break loop2;
        }
      }
      nextToken();
    }
  }

  // console.log('exit at:'); dumpPState(s);

  return {
    tokens: s.tokens.splice(tokenStartIndex), // move tokens from s
    vars:   vars,
  };
}


function parseMacroDefinition(m /*:Node*/) {
  // MacroDefinition := "macro" <space>+ macroPattern "->" macroBody
  //
  // macroPattern    := "{" Token macroExprToken* "}"
  //                  | <macroExprToken where first must be Token>
  //
  // macroBody       := "{" macroExprToken* "}"
  //                  | macroExprToken
  //
  // macroExprToken  := "(" macroExprToken ")"
  //                  | "{" macroExprToken "}"
  //                  | "${" macroExprToken "}"
  //                  | "[" macroExprToken "]"
  //                  | macroToken
  // macroToken      := (macroVar | Token)
  // macroVar        := "..."? "$" <any Identifier except "$">?
  //
  // E.g.
  //   macro x -> { y }      # 'x()' -> 'y()'
  //   macro {x} -> { y }    # 'x()' -> 'y()'
  //   macro x -> y()        # 'x()' -> 'y()()'
  //   macro x -> {}         # 'x()' -> '()'
  //   macro {x} -> {}       # 'x' -> '()'
  //   macro \u007B -> { y \u007B } # '}' -> 'y }'
  //   macro {x 1} -> {y} # 'x 1' -> 'y'
  //   macro {x $} -> {y} # 'x 123' -> 'y'

  var p = this;
  var n = (kOptIncludeDefs in p) ? null : p.startNode(); // Noop node
  var s = p.state;
  m.__proto__ = MacroDef.prototype;

  // Ignore comments while parsing macro
  var orig_pushComment = p.pushComment;
  p.pushComment = function(){};

  try {
    // macroPattern
    m.pattern = parseTokens(p, kPattern);
    // console.log('m.pattern' +
    //             '\n  .tokens: '+fmttoks(m.pattern.tokens) +
    //             '\n  .vars:   '+(m.pattern.vars ? '{'+fmtit(m.pattern.vars.keys())+'}' : '-'));

    // "=>"
    // if (s.type === tokTypes.arrow) {
    //   p.nextToken(); // advance to next token w/o remembering "=>"
    // } else {
    //   p.raise(s.start, 'Unexpected token (expected "=>")');
    // }

    // "->"
    if (s.type === tokTypes.plusMin && s.input.charCodeAt(s.pos) === ccGreaterThan) {
      s.start = s.pos; ++s.pos; s.type = tokTypes.relational; // p.nextToken();
      p.nextToken();
    } else {
      p.raise(s.start, 'Unexpected token (expected "->")');
    }

    // macroBody
    m.body = parseTokens(p, kBody, m.pattern.vars);
    // console.log('m.body' +
    //             '\n  .tokens: ' + fmttoks(m.body.tokens))
  } finally {
    p.pushComment = orig_pushComment;
  }

  // optional ;
  if (s.type === tokTypes.semi) {
    p.nextToken();
  }

  p.finishNode(m, "MacroDefinition");

  // Register macro
  var prevMacro = p.macroCtx.defineMacro(m);
  if (prevMacro) {
    // Would fail here if we want:
    // p.raise(p.state.start, 'Duplicate macro definition "'+m.id.name+'"');
    p.pushDiagnostic('warn', m.start, 'Macro '+FmtMacro(m,false)+' redefined', m.end);
  }

  // console.log('macrodef:', FmtMacro(m));
  //process.exit(1);

  if (kOptIncludeDefs in p) {
    return m;
  } else {
    p.finishNode(n, "Noop");
    // Add comment to replacement node
    // E.g. "// macro {...} => {...}"
    if (kOptIncludeComments in p) {
      if (m.leadingComments) { n.leadingComments = m.leadingComments; }
      if (m.trailingComments) { n.trailingComments = m.trailingComments; }
      let raw = p.input.substring(m.start, m.end).trim();
      if (raw) {
        let isBlock = raw.indexOf('\n') !== -1;
        let comment = {
          type:  isBlock ? "CommentBlock" : "CommentLine",
          value: isBlock ? raw : ' '+raw,
          start: m.start,
          end:   m.end,
          loc:   {start: m.loc.start, end: m.loc.end},
          range: [m.start, m.end],
        };
        if (n.leadingComments) {
          n.leadingComments.push(comment);
        } else if (n.trailingComments) {
          n.trailingComments.unshift(comment);
        } else {
          n.leadingComments = [comment];
        }
      }
    }
    return n;
  }
};

