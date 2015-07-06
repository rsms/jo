import {SrcError} from './util'
import fs from 'asyncfs'
import path from 'path'


const npmRefPrefix = 'npmjs.com/';


class Pkg {
  // dir:string;      // e.g. "/jo/src/foo/bar"
  // ref?:string;     // e.g. "foo/bar"
  // jopath?:string;  // e.g. "/jo"
  // files:string;
  // imports:{};      // e.g. {pkgref: [Import], ...}
  // exports:{};      // e.g. {identifier: Export|null, ...}
  // module?:IRModule // a compiled module
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
    this.pkgInfo = null
  }

  get id() { 
    return this.ref || this.dir
  }

  get hasMainFunc() {
    return !!this.mainFunc || (this.pkgInfo && this.pkgInfo.main);
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


  // async loadSrcFiles():SrcFile[]
  loadSrcFiles() {
    return Promise.all(this.files.map(async (fn) => {
      let filename = this.dir + '/' + fn;
      let st = await fs.stat(filename);
      let type = path.extname(fn).substr(1).toLowerCase();
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


  async pkgFromRef(ref:string, importedAt:SrcLocation=null, target:Target=null) {
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
      } catch (e) {
        if (e.name === 'TypeError') { throw e; }
        importError = e;
      }

    } else if (NPMPkg.refIsNPM(ref)) {
      // NPM package
      // TODO: In the future, we should verify NPM packages using parentPkg.dir etc.
      return new NPMPkg(NPMPkg.stripNPMRefPrefix(ref));

    } else {
      // ref
      if (target && target.builtInModuleRefs[ref]) {
        // built-in packages takes precedence
        return new BuiltInPkg(ref);
      }
      try {
        let [_files, pkgdir, jopath] = await Pkg._envReadRefSrcDir(ref)
        files = _files.filter(SrcFile.filenameMatches)
        pkg   = new Pkg({ref:ref, dir:pkgdir, files:files, jopath:parentPkg.jopath})
      } catch (e) {
        if (e.name === 'TypeError') { throw e; }
        importError = e;
      }
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


  static async _envReadRefSrcDir(ref) {
    // try {
    return await Env.readdir(ref, 'src')
    // } catch (e) {}
    // return await Env.readdir(ref)
  }


  // (ref:string)
  static async fromRef(ref) {
    let files, pkg
    if (ref[0] === '.' || ref[0] === '/') {
      // pathname
      files = (await fs.readdir(ref)).filter(SrcFile.filenameMatches)
      pkg   = new Pkg({ref:null, dir:ref, files:files, jopath:null})
    } else {
      // pkgref
      let [_files, pkgdir, jopath] = await Pkg._envReadRefSrcDir(ref)
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


class BuiltInPkg extends Pkg {
  // isBuiltIn:bool  // true
  constructor(ref) {
    super({ref:ref})
  }
}

BuiltInPkg.prototype.isBuiltIn = true;


class NPMPkg extends Pkg {
  // isNPM:bool  // true
  constructor(ref) {
    super({ref:ref})
  }
}

NPMPkg.prototype.isNPM = true;
NPMPkg.refIsNPM = function(ref) {
  return ref.length > npmRefPrefix.length &&
         ref.substr(0, npmRefPrefix.length) === npmRefPrefix;
}
NPMPkg.stripNPMRefPrefix = function(ref) {
  return ref.substr(npmRefPrefix.length);
}

