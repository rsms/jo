var tokTypeInverseMap;

class MacroDef {

  static tokenTypeToJson(t) {
    var flags = 0;
    if (t===tokTypes.name || t===tokTypes.regexp || t===tokTypes.string || t===tokTypes.num) {
      flags |= 1; // hasValue
    }
    if (t.keyword) {          flags |= 2; }
    if (t.beforeExpr) {       flags |= 4; }
    if (t.startsExpr) {       flags |= 8; }
    if (t.rightAssociative) { flags |= 16; }
    if (t.isLoop) {           flags |= 32; }
    if (t.isAssign) {         flags |= 64; }
    if (t.prefix) {           flags |= 128; }
    if (t.postfix) {          flags |= 256; }
    if (t.binop) {            flags |= 512; }
    if (!tokTypeInverseMap) {
      tokTypeInverseMap = new Map;
      for (var k in tokTypes) { tokTypeInverseMap.set(tokTypes[k], k); }
    }
    var v = [ // struct
      /* name  = */ tokTypeInverseMap.get(t),
      /* flags = */ flags,
    ];
    assert(this.tokenTypeFromJson(v) === t);
    return v;
  }

  static tokenTypeFromJson(v) {
    return tokTypes[v[0]]; // else: recreate
  }

  static tokenToJSON(t, typeIDs) {
    var tag = t[TokenVarTag];
    return [ // struct
      /* startPos    = */ t.start,
      /* endPos      = */ t.end,
      /* startLine   = */ t.loc.start.line,
      /* startColumn = */ t.loc.start.column,
      /* endLine     = */ t.loc.end.line,
      /* endColumn   = */ t.loc.end.column,
      /* vartag      = */ (tag === TokenVar1) ? '1' : (tag === TokenVarN) ? 'N' : 0,
      /* type        = */ typeIDs.get(t.type),
      /* value       = */ t.value,
    ];
  }

  static patternToJSON(p, typeIDs) {
    var e, vars = null; // p.vars is of type Map<string,Token>
    if (p.vars) {
      vars = {};
      for (e of p.vars) {
        vars[e[0]] = this.tokenToJSON(e[1], typeIDs);
      }
    }
    return [ // struct
      /* tokens = */ p.tokens.map(function(t) { return this.tokenToJSON(t, typeIDs) }),
      /* vars   = */ vars, // Map<string,Token>
    ];
  }

  static macroToJSON(m, typeIDs) {
    return [ // struct
      /* startPos    = */ m.start,
      /* endPos      = */ m.end,
      /* startLine   = */ m.loc.start.line,
      /* startColumn = */ m.loc.start.column,
      /* endLine     = */ m.loc.end.line,
      /* endColumn   = */ m.loc.end.column,
      /* pattern     = */ this.patternToJSON(m.pattern, typeIDs),
      /* body        = */ this.patternToJSON(m.body, typeIDs)
    ];
  }

  // TODO: MacroDef.macrosFromJSON et al
  static macrosToJSON(macros) {
    if (!macros) { return null; }
    assert(macros instanceof Map);
    var z = macros.size, v = new Array(z), i = 0, typeID, e, t, m, kv, m2;
    // macros is of type Map<TokenType,Map<string,Macro>>
    var typeIDs = new Map;
    for (e of macros) {
      t = this.tokenTypeToJson(e[0], i);
      typeIDs.set(e[0], t[0]); // TokenType => name:string
      e[0] = t;
      v[i++] = e;
    }
    for (i = 0; i !== z; ++i) {
      e = v[i];
      t = e[0][1] & 1; // type.flags & hasValue
      m = e[1]; // either Map<string,Macro> or Macro
      if (t) {
        assert(m instanceof Map); // type-value to Macro
        m2 = {};
        for (kv of m) {
          m2[kv[0]] = this.macroToJSON(kv[1], typeIDs);
        }
        e[1] = m2;
      } else {
        e[1] = this.macroToJSON(kv[1], typeIDs);
      }
    }
    return v;
  }

}
