
// interface macroMatchCtx {
//   m: MacroDef;
//   token: Token; // { type: BabylonTokenType, value: String|null }
//   persistToken(t:Token):Token;
//   nextToken():Token;
//   error(message:string);
//   createSnapshot():Snapshot;
//   restoreSnapshot?(Snapshot);
// }

function macroMatch(ctx:macroMatchCtx) { //:Map<Token,Token[]>||null||kNoMatch
  // pass:   1   2   3   4
  // mtoks: foo  [   $a  ]
  // stoks: foo  [   1   ]

  var m = ctx.m;
  var stok = ctx.token;

  function consumeSToks(mtokTerm, isRest, rewindLast) {
    var depth = 0;
    var termType = mtokTerm ? mtokTerm.type : tokTypes.semi;
    var t, tokens = null; // Token[];
    var snapshot;
    // console.log('consumeSToks: termType:', repr(termType.label))

    loop: while (true) {
      // console.log('  consumeSToks stok:', fmttok(stok))

      switch (stok.type) {
        case termType: {
          if (depth === 0) {
            break loop;
          }
          // fallthrough
        }
        case tokTypes.bracketL:
        case tokTypes.braceL:
        case tokTypes.dollarBraceL:
        case tokTypes.parenL: {
          // TODO: support flow generics, eg. "Set<Map<int,string>>"
          ++depth;
          break;
        }
        case tokTypes.bracketR:
        case tokTypes.braceR:
        case tokTypes.parenR: {
          if (depth === 0 && isRest && termType === tokTypes.semi) {
            // E.g.
            //   macro foo { ...$b } -> {}
            //   (foo 1 2 3)
            //             ^
            break loop;
          }
          --depth;
          break;
        }
        case tokTypes.eof: {
          if (!isRest) {
            ctx.error('Unterminated macro match');
          }
          // Rest ended at EOF -- validation happens by receiver of return value
          // if (!tokens) { tokens = []; } tokens[HasEOF] = true;
          break loop;
        }
      }
      
      t = ctx.persistToken(stok);
      if (!tokens) { tokens = [t]; } else { tokens.push(t); }

      if (depth === 0 && !isRest) {
        // Not a "..." and at the root -- we have taken exactly one stok
        break;
      }

      if (rewindLast) {
        // We have been asked to rewind the last token we parse. To do that, we need to
        // take a snapshot of the state before advancing to the next token.
        snapshot = ctx.createSnapshot();
      }

      stok = ctx.nextToken();
    }

    if (rewindLast && snapshot) {
      // We have been asked to rewind (or undo) the last token
      assert(snapshot);
      ctx.restoreSnapshot(snapshot);
    }

    return tokens;
  }


  var i = 0, L = m.pattern.tokens.length
    , mtok
    , mtokTerm
    , stoks
    , subs = null // Map<Token,Token[]> var substitutions
    , skipNextToken = false
    , varTag
    , bodyToken
    ;
  for (; i !== L; ++i) {
    mtok = m.pattern.tokens[i];
    // console.log('mtok:', fmttok(mtok) + ', stok:', fmttok(stok))

    if (varTag = mtok[TokenVarTag]) {
      // Read source tokens and associate them with the variable
      mtokTerm = m.pattern.tokens[i+1];
      stoks = consumeSToks(
        mtokTerm,
        varTag === TokenVarN,
        /*rewindLast=*/ ctx.createSnapshot && mtok.isRest && i === L-1
      );
      if (varTag === TokenVarN) {
        // Because "...$" consumes a terminating token, so it's already queued up
        // at this point.
        skipNextToken = true;
      } else if (!stoks) {
        return kNoMatch;
      }
      // console.log('x mtok:', fmttok(mtok))
      if (bodyToken = mtok[MatchingToken]) {
        // Does appear in body -- associate so it can later be expanded
        if (!subs) { subs = new Map }
        subs.set(bodyToken, stoks || kEmpty);
          // `kEmpty` means that bodyToken is replaced by nothing, E.g.
          //    macro A(...$) -> a($); A() => a()
      }
      // console.log(fmttok(mtok)+' -> [' + (!stoks ? '' : stoks.map(fmttok).join(', ')) + ']');
    } else {
      // match tokens
      if (!tokeq(mtok, stok)) {
        // console.log('kNoMatch', fmttok(mtok), '!==', fmttok(stok))
        return kNoMatch;
      }
    }

    if (skipNextToken) {
      skipNextToken = false;
    } else if (i < L-1) {
      stok = ctx.nextToken();
    }

  }

  return subs;
}


function reportMacroMatchAttempt(p:Parser, m:MacroDef, startPos:int, endPos:int) {
  p.pushDiagnostic(
    'info',
    startPos === undefined ? p.state.start : startPos,
    'Attempted to expand macro '+FmtMacroPat(m.pattern, kPattern, false),
    endPos
  );
  // console.log(p[kDiagnostics][p[kDiagnostics].length-1].message);
}


function maybeMatchMacroPattern(p:Parser, m:MacroDef) {
  // console.log('- - - - - - - - - - - begin match - - - - - - - - - - -') dumpPState(p.state);

  var subs = null;
  if (m.pattern) {
    // State:
    //  macro bar {$a $b} -> { ($a, $b) }
    //  foo bar 3 4 5
    //         ^-- state.pos
    //      ^----- state.start
    //
    var pStateBeforeMatch = p.state.clone();
    subs = macroMatch({
      m:               m,
      token:           p.state,
      persistToken:    copytok,
      error:           function(msg) { p.raise(p.state.start, msg) },
      nextToken:       function() { p.nextToken(); return p.state; },
      createSnapshot:  p.state.clone.bind(p.state),
      restoreSnapshot: function(snapshot) { p.state = snapshot; },
    });
    if (subs === kNoMatch) {
      // didn't match -- restore state
      var endPos = p.state.end;
      p.state = pStateBeforeMatch;
      reportMacroMatchAttempt(p, m, p.state.start, endPos)
      // console.log('- - - - - - - - - - - end match nomatch - - - - - - - - - - -')
      return kNoMatch;
    }

    // Note: match might have replaced p.state at this point

    // dumpPState(p.state); console.log('- - - - - - - - - - - end match subs - - - - - - - - - -')
    // State:
    //  macro bar {$a $b} -> { ($a, $b) }
    //  foo bar 3 4 5
    //             ^-- state.pos
    //            ^--- state.start
    //
  } else {
    // dumpPState(p.state); console.log('- - - - - - - - - - - end match simple - - - - - - - - -')
    // Simple substitution macro w/o match
    // State:
    //  macro bar { 1 }
    //  foo bar 3 4 5
    //         ^-- state.pos
    //      ^----- state.start
    //
  }

  return subs;
}
