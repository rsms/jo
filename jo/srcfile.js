// interface SrcFile {
//   dir:string       // e.g. "/abs/path/foo"
//   relpath:string   // e.g. "foo/bar.js"
//   name:string      // e.g. "bar.js"
//   st:fs.Stat
//   files:SrcFile[]  // if st.isDirectory()
//   parsed?:ParseResult
//   unresolvedIDs?:{name:ASTNode}
//   definedIDs?:{name:ASTNode}
// }

class SrcFile {

  // Returns true if filename might be a source file
  // (filename:string):bool
  static filenameMatches(filename) {
    return filename.match(/^[^\.].*\.js$/);
  }

  // Takes a list of filenames based in basedir and returns a possibly
  // shorter list of SrcFiles.
  // (filenames:string[], basedir:string):SrcFile[]
  // static SrcFileFromFilteringFilenames(filenames, basedir) {
  //   basedir = basedir ? basedir+'/' : ''
  //   return (filenames || []).
  //     filter(SrcFile.filenameMatches).
  //     map(filename => new SrcFile({ filename: basedir+filename }))
  // }

}
