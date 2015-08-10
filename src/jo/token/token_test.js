
function TestScanner(t) {
  let srcbuf = new Buffer('(  42\nfoo)')
  let fset = new FileSet()
  let f = fset.addFile('foo.js', fset.base, srcbuf.length)
  let s = Scanner(f, srcbuf)

  // t.log(s);
  let tok;
  while (tok = s.scan()) {
    t.logf('s(1) => %s (%j)', tok, s.stringValue);
  }
}