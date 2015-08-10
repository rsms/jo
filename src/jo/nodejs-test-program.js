
class NodeJSTestProgram extends NodeJSProgram {

  filenameDir() {
    if (this.pkg.jopath) {
      // E.g. ref:"foo/bar" => "JOPATH/bin/bar"
      return WorkDir.path + '/testpkg';
    } else {
      // E.g. dir:"/jo/foo/bar" => "./bar"
      return WorkDir.path + '/testdir';
    }
  }

  programName() {
    return (this.pkg.ref || this.pkg.dir.replace(/^\/+|\/$/g, '').replace(/\//g, '.')) +
           (this.target.isDevMode ? '-g' : '');
  }


  addHeaderCode(codebuf:CodeBuffer2) {
    codebuf.append('var __$jotests = new Map;\n');
  }


  addEntryCode(codebuf:CodeBuffer2) {
    codebuf.append(
      '__$im(require,"testing").MainStart("'+this.pkg.id+'",__$jotests,process.argv);\n'
    );
  }

}
