type SrcFile_ /* BUG[babel#2105] */ = {
  dir:string;       // e.g. "/abs/path/foo"
  relpath:string;   // e.g. "foo/bar.js"
  name:string;      // e.g. "bar.js"
  st:fs.Stat;
  files:SrcFile[];  // if st.isDirectory()
  parsed?:ParseResult;
  unresolvedIDs?:{name:ASTNode};
  definedIDs?:{name:ASTNode};
  isTest:bool;
};

class SrcFile {

  // Returns true if filename might be a source file
  static filenameMatches(fn:string) {
    return fn.match(/^[^\.].*\.js$/);
  }

  static filenameIsTest(fn:string) {
    return fn[0] !== '_' && fn.endsWith('_test.js');
  }

  get isTest() {
    var b = SrcFile.filenameIsTest(this.name);
    Object.defineProperty(this, 'isTest', {value:b});
    return b;
  }

  toString() {
    return this.name;
  }
}
