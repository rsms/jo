
function evalMacro(macroCtx, p, m, subs, scopeSet) {
  // Note: This function is not recrusive itself, but relies on maybeExpandInnerMacro
  // for cyclic expansion checks. I.e. we can't call evalMacro directly from evalMacro.

  // memozied?
  var memoized = m[MemoizedResult];
  if (memoized) {
    return memoized;
  }

  // expand substitutions
  var toks;
  if (subs) {
    toks = [];
    m.body.tokens.forEach(function(etok) {
      var subToks = subs.get(etok);
      if (subToks) {
        // kEmpty means that etok is replaced by nothing, otherwise we have substitutes:
        if (subToks !== kEmpty) {
          assert(Array.isArray(subToks));
          toks = toks.concat(subToks);
        }
      } else {
        // Verbatim
        toks.push(etok);
      }
    })
  } else {
    // No variables
    toks = m.body.tokens;
  }

  // match & expand inner macros
  var i = 0, L = toks.length, m2, t, r;
  for (; i !== L; ++i) {
    t = toks[i];
    if (m2 = macroCtx.findMacro(t.type, t.value)) {
      if (r = maybeExpandInnerMacro(macroCtx, p, m2, m, toks)) {
        r[0] = i; // splice start index = first token replaced
        toks.splice.apply(toks, r);
        i += r[1]-1; // number-of-tokens consumed by maybeExpandInnerMacro
      }
    }
  }

  if (!subs) {
    // memoize pure macro
    m[MemoizedResult] = toks;
  }

  return toks;
}


function maybeExpandInnerMacro(macroCtx, p, m, parentM, stoks) {
  if (macroCtx._evalSet) {
    if (macroCtx._evalSet.has(parentM)) {
      let s = [];
      for (let v of macroCtx._evalSet) { s.push(v); }
      s.push(parentM);
      s = s.map(function(m){ return FmtMacro(m, false) });
      p.raise(
        p.state.start,
        'Cyclic macro expansion ' + s.join('  -->  ')
      );
    } else {
      macroCtx._evalSet.add(parentM);
    }
  } else {
    macroCtx._evalSet = new Set([parentM])
  }

  var matchCtx
    , subs
    , numToksConsumed = 1
    ;
  if (m.pattern.tokens.length > 1) {
    // Note: If the number of tokens in macro pattern is just 1, then we have already
    // matched that token (before this function was called.) So we only perform a full
    // match for len>1.
    // In the future if/when we support patterns with variables as the first token,
    // the condition should include a check for if the one and only token is a variable,
    // as it will be in need of substitution. E.g.
    //    if (m.pattern.tokens.length > 1 || TokenVarTag in m.pattern.tokens[0])
    matchCtx = {
      m:               m,
      token:           stoks[0],
      _tokenIndex:     0,
      persistToken:    function(t) { return t },
      error:           function(msg) { p.raise(stoks[++this._tokenIndex].start, msg) },
      nextToken:       function() { return stoks[++this._tokenIndex] },
    };
    subs = macroMatch(matchCtx);
    if (subs === kNoMatch) {
      p.reportMacroMatchAttempt(m, stoks[0].start)
      return false;
    }
    numToksConsumed += matchCtx._tokenIndex;
  }

  var toks = evalMacro(macroCtx, p, m, subs);
  // console.log('EIM evalMacro ->', toks.map(fmttok).join(', '))
  macroCtx._evalSet.delete(parentM);
  return [0, numToksConsumed].concat(toks); // suitable for applying on Array.splice
}


function expandMacro(p, m, toks, cont) {
  var s = p.state;
  var toksIndex = 0;
  var endAfterFinishNode = false;
  var orig_nextToken = p.nextToken;
  var pstateAfterMacroMatch = s.clone();
  // console.log('+++++++++++++++++++++++++++ begin expand +++++++++++++++++++++++++++');
  // console.log(fmtcallstack());


  p.nextToken = function expandMacro$nextToken() {
    // console.log('EXP next');
    // console.log(fmtcallstack());

    var t = toks[toksIndex++];
    if (!t) {
      // console.log('EXP end');
      p.state = pstateAfterMacroMatch;
      // console.log('EXP s at end:'); dumpPState(p.state);
      // console.log('+++++++++++++++++++++++++++ end expand +++++++++++++++++++++++++++');
      var r = (p.nextToken = orig_nextToken).call(p);
      cont(true);
      return r;
    }

    s.end             = t.end;
    s.start           = t.start;
    s.startLoc        = { line: t.loc.start.line, column: t.loc.start.column };
    s.pos             = t.end;
    s.type            = t.type;
    s.value           = t.value;

    // console.log('EXP t: '+fmttok(t))
    // console.log('EXP s: '+fmttok(s))
    // console.log('EXP s when leaving next:'); dumpPState(s);
  }

  p.nextToken();
}


function maybeExpandMacro() {
  var m = this.macroCtx.findMacro(this.state.type, this.state.value);
  if (!m) {
    return;
  }

  this.disableMacroExpansionHook();
  var finalize = this.enableMacroExpansionHook.bind(this);

  // attempt match
  var subs = maybeMatchMacroPattern(this, m);
  if (subs === kNoMatch) {
    return finalize();
  }

  // evaluate macro, returning the tokens which should replace the match
  //console.log('subs:', subs);
  var toks = evalMacro(this.macroCtx, this, m, subs);
  // console.log('expanded toks:', toks.map(fmttok).join(', '))

  if (toks.length === 0) {
    // No replacement tokens
    // E.g. "macro { ... } -> {}"
    this.nextToken();
    finalize();
  } else {
    // produce `toks` for the parser
    expandMacro(this, m, toks, finalize);
  }
};
