class macroCtx {
  _defScope = [null, null];
  _evalSet:Set<MacroDef> = null; // contains all macros currently being expand-eval'd

  pushMacroDefScope() {
    this._defScope = [this._defScope, null];
  }

  popMacroDefScope() {
    this._defScope = this._defScope[0];
  }

  defineMacro(m) {
    // TODO: use a b-tree or trie instead of this hard-coded one-step-deep setup
    var typeMap = this._defScope[1];
    if (!typeMap) {
      typeMap = this._defScope[1] = new Map;
    }
    assert(m.pattern.tokens.length > 0);
    var tok0 = m.pattern.tokens[0];
    // console.log('defineMacro tok0:', fmttok(tok0))
    var t = tok0.type; //:BabylonTokenType
    var node = typeMap.get(t);
    var prev;
    if (t===tokTypes.name || t===tokTypes.regexp || t===tokTypes.string || t===tokTypes.num) {
      // identified by type + value
      if (!node) {
        typeMap.set(t, node = new Map);
        node.set(tok0.value, m);
      } else {
        prev = node.get(tok0.value);
        node.set(tok0.value, m);
      }
    } else {
      if (node) {
        prev = node;
      }
      typeMap.set(t, m);
    }
    return prev;
  }

  findMacro(type, value) {
    var t = type
      , m
      , scope = this._defScope
      ;
    if (t===tokTypes.name || t===tokTypes.regexp || t===tokTypes.string || t===tokTypes.num) {
      while (1) {
        if ((m = scope[1]) && (m = m.get(t)) && (m = m.get(value))) {
          return m;
        }
        if (!(scope = scope[0])) {
          return null;
        }
      }
    } else {
      while (1) {
        if ((m = scope[1]) && (m = m.get(t))) {
          return m;
        }
        if (!(scope = scope[0])) {
          return null;
        }
      }
    }
  }

}
