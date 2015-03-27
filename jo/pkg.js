class Pkg {
  // dir:string;      // e.g. "/jo/src/foo/bar"
  // ref?:string;     // e.g. "foo/bar"
  // jopath?:string;  // e.g. "/jo"
  // files:string;
  // imports:{};      // e.g. {pkgref: [Import], ...}
  // exports:{};      // e.g. {identifier: Export|null, ...}
  // module?:IRModule  // a compiled module
  // deps:Pkg[]       // packages this package depends on

  constructor({dir, ref, jopath, files}) {
    this.dir = dir
    this.ref = ref
    this.jopath = jopath
    this.files = files
    this.imports = {}
    this.exports = {}
    this.module = null
    this.deps = []
  }

  get id() { 
    return this.ref || this.dir
  }

  // parsePkgInfo(code:string):PkgInfo
  static parsePkgInfo(code) {
    // find '//#jopkg{"imports":["./bar","react"]}'
    const jopkgStmtPrefix = '//#jopkg'
    var end, begin = code.indexOf(jopkgStmtPrefix);
    if (begin !== -1) {
      begin += jopkgStmtPrefix.length
      end = code.indexOf('\n', begin)
    }
    if (begin === -1 || end === -1) {
      throw new Error('missing jopkg statement')
    }
    return JSON.parse(code.substring(begin, end))
  }

  // async resolveOutputFile(output:string):string
  async resolveOutputFile(output) {
    let st = await fs.stat(output)
    if (st && st.isDirectory()) {
      // E.g. output="/home/rsms" => "/home/rsms/foo.js"
      return path.basename(this.id) + '.js'
    }
    return output
  }

  // irModuleFile():string
  irModuleFile() {
    if (this.jopath && this.ref) {
      // E.g.
      //  this.ref="fb/react"
      //  this.jopath="/home/rsms/jo"
      //  => "/home/rsms/jo/pkg/ir/fb/react.js"
      return this.jopath + '/pkg/ir/' + this.ref + '.js'
    } else {
      // E.g.
      //  this.ref="fb/react"
      //  WorkDir.path="/tmp/jo-1234"
      //  => "/tmp/jo-1234/pkg/ir/fb/react.js"
      return WorkDir.path + '/' +
        ( this.ref ? 'pkg/ir/' + this.ref :
                     'pkgdir/ir' + this.dir
        ) + '.js'
    }
  }


  // async loadSrcFiles():SrcFile[]
  loadSrcFiles() {
    return Promise.all(this.files.map(async (fn) => {
      let filename = this.dir + '/' + fn
      let st = await fs.stat(filename)
      let type = path.extname(fn).substr(1).toLowerCase()
      if (type === '') { throw `unknown type of file: "${fn}"` }
      return /*SrcFile*/{
        dir:     this.dir,
        name:    fn,
        relpath: fn,
        st:      st,
        type:    type,
        pkg:     this,
      }
    }))
  }


  // (ref:string, importedAt?:SrcLocation)
  async pkgFromRef(ref, importedAt=null) {
    var parentPkg = this
    var pkgdir

    if (ref[0] === '.') {
      // relative
      pkgdir = path.normalize(parentPkg.dir + '/' + ref)

      if (parentPkg.ref) {
        ref = path.normalize(parentPkg.ref + '/' + ref)
        if (ref[0] === '.') {
          throw SrcError(
            'ImportError',
            importedAt,
            'recursive dependency; trying to import parent package from child package'
          )
        }
      }
    }

    let pkg, importError, files = [];
    
    if (ref[0] === '.') {
      // path
      try {
        files = (await fs.readdir(pkgdir)).filter(SrcFile.filenameMatches)
        pkg   = new Pkg({ref:ref, dir:pkgdir, files:files, jopath:parentPkg.jopath})
      } catch (e) { importError = e; }
    } else {
      // ref
      try {
        let [_files, pkgdir, jopath] = await Env.readdir('src/' + ref)
        files = _files.filter(SrcFile.filenameMatches)
        pkg   = new Pkg({ref:ref, dir:pkgdir, files:files, jopath:parentPkg.jopath})
      } catch (e) { importError = e; }
    }

    if (!importError && files.length === 0) {
      throw SrcError('PkgError', null, `no source files found in package "${pkg.id}"`, null, [
        {message:'imported here', srcloc:importedAt}
      ]);
    } else if (importError) {
      throw SrcError('ImportError', importedAt, importError.message);
    }

    return pkg
  }


  // (ref:string)
  static async fromRef(ref) {
    let files, pkg
    if (ref[0] === '.' || ref[0] === '/') {
      // pathname
      files = (await fs.readdir(pkgdir)).filter(SrcFile.filenameMatches)
      pkg   = new Pkg({ref:null, dir:pkgdir, files:files, jopath:null})
    } else {
      // pkgref
      let [_files, pkgdir, jopath] = await Env.readdir('src/' + ref)
      files = _files.filter(SrcFile.filenameMatches)
      pkg   = new Pkg({ref:ref, dir:pkgdir, files:files, jopath:jopath})
    }
    if (files.length === 0) {
      throw `no source files found in package "${pkg.id}"`
    }
    return pkg
  }


  // (files:string[])
  static async fromFiles(files) {
    for (let f of files) {
      if (!SrcFile.filenameMatches(f)) {
        throw new Error(`unexpected file type "${f}"`)
      }
    }
    let pkgdir = path.dirname(files[0])
    return new Pkg({ref:null, dir:pkgdir, files:files, jopath:null})
  }


}
