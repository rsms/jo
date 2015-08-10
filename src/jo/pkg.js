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
  // module?:Module   // a compiled module
  // testModule?:TestModule // a compiled test module
  // deps:Pkg[]       // packages this package depends on
  // programs:Program[]

  constructor({dir, ref, jopath, files}) {
    this.dir = dir
    this.ref = ref
    this.jopath = jopath
    this.files = files
    this.imports = {}
    this.module = null
    this.testModule = null
    this.mainFunc = null
    this.deps = []
    this.programs = []
  }

  get id() {
    return this.ref || this.dir
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

  // Creates SrcFile objects and retrieves fs.stat.
  // Note: Does NOT load the actual file data.
  // async loadSrcFiles({includeTests:bool}):SrcFile[]
  loadSrcFiles({includeTests=false}) {
    var filenames = includeTests ? this.files
                                 : this.files.filter(fn => !SrcFile.filenameIsTest(fn));
    return Promise.all(filenames.map(async (fn) => {
      let filename = this.dir + '/' + fn;
      let st       = await fs.stat(filename);
      let type     = path.extname(fn).substr(1).toLowerCase();
      return { __proto__:SrcFile.prototype,
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


  static async _envReadRefSrcDir(ref:string) {
    // try {
    return await Env.readdir(ref, 'src')
    // } catch (e) {}
    // return await Env.readdir(ref)
  }


  static async fromRef(ref:string) {
    let files, pkg;
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


  static async fromFiles(files:string[]) {
    for (let f of files) {
      if (!SrcFile.filenameMatches(f)) {
        throw new Error(`unexpected file type "${f}"`)
      }
    }
    let pkgdir = path.dirname(files[0])
    return new Pkg({ref:null, dir:pkgdir, files:files, jopath:null})
  }


  static importsFromModuleInfo(info) {
    var imports = null;
    if (info && info.imports) {
      imports = {};
      for (let ref of info.imports) {
        imports[ref] = [] // empty "importedAt" list
      }
    }
    return imports;
  }


  // objects: {string:{nodes:ASTNode[],names:string[]}}
  // e.g. { react: { nodes: [ [Object] ], names: [ 'default', 'Component', '_bar_js$X' ] }, ... }
  static mergeImports(base, ...others) {
    others.forEach(other => {
      Object.keys(other).forEach(ref => {
        let otherImp = other[ref];
        let baseImp = base[ref];
        if (baseImp) {
          baseImp.nodes = baseImp.nodes.concat(otherImp.nodes)
          baseImp.names = baseImp.nodes.concat(otherImp.names)
        } else {
          base[ref] = otherImp;
        }
      })
    })
    return base;
  }


  toJSON() {
    return {
      dir:        this.dir,
      ref:        this.ref,
      jopath:     this.jopath,
      files:      this.files,
      imports:    this.imports,
      module:     this.module,
      testModule: this.testModule,
      mainFunc:   this.mainFunc,
      deps:       this.deps,
      programs:   this.programs,
    };
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
    this.module = new NPMModule(require.resolve(ref)); // warning: blocking I/O
  }

  get id() {
    return npmRefPrefix + this.ref
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
