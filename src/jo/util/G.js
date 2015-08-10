var G = {

  // Returns the first value of iterable obj
  first(obj) {
    if (obj instanceof Array) { return obj[0]; }
    let i = obj[Symbol.iterator];
    if (!i) { throw new Error('non-iterable object') }
    return i.call(obj).next().value;
  },


  // Returns the last value of iterable obj
  last(obj) {
    if (obj instanceof Array) { return obj[obj.length-1]; }
    let c, L, i = obj[Symbol.iterator];
    if (!i) { throw new Error('non-iterable object') }
    i = i.call(obj);
    while (!(c = i.next()).done) {
      L = c.value;
    }
    return L;
  },


  // Returns all items of obj as an array
  list(obj) {
    if (obj instanceof Array) { return obj; }
    if (obj.size !== undefined) {
      let i = 0, a = new Array(obj.size);
      for (let v of obj) { a[i++] = v; }
      return a;
    } else {
      let a = [];
      for (let v of obj) { a.push(v) }
      return a;
    }
  },


  // matches returns a generator that yields each match in a string.
  matches: function*(s:string, re:RegExp) { //:RegExpMatch
    if (!(re instanceof RegExp)) {
      re = new RegExp(String(re), 'g');
    } else if (re.lastIndex !== 0 || !re.global) {
      let flags = (re + '').replace(/[\s\S]+\//, '');
      if (flags.indexOf('g') === -1) { flags += 'g'; }
      re = new RegExp(re.source, flags);
    }
    var m;
    if (__DEV__) {
      let limit = 100000;
      while (m = re.exec(s)) {
        if (--limit === 0) { throw new Error('infinite loop'); }
        yield m;
      }
    } else {
      while (m = re.exec(s)) {
        yield m;
      }
    }
  },

}
