
// interface IRModule {
//   file?string
//   code?:string
//   map?:SourceMap
//   stat?:fs.Stat
// }

const kSpaces = '                                                                              '
var slice = Array.prototype.slice

class BuildCtx {
  constructor(target, logger) {
    this.log = logger
    this.target = target
    this.builtPkgs = {}  // {pkgdir: Pkg} -- packages built in this context
    this.depth = 0
    this.pkgs = [] // Pkg[]
    this.termstyle = TermStyle.stdout
  }

  registerBuiltPkg(pkg) {
    if (pkg.dir in this.builtPkgs) {
      return false
    }
    this.builtPkgs[pkg.dir] = pkg
    return true
  }

  getBuiltPkg(pkgdir) {
    return this.builtPkgs[pkgdir]
  }

  // log functions that add an indentation when depth>0
  logIndent() { return kSpaces.substr(0, (this.depth * 2)-1) }
  logDebug(...args) {
    if (this.depth && this.log.level >= Logger.DEBUG) {
      this.log.debug(this.logIndent(), ...args)
    } else {
      this.log.debug(...args)
    }
  }
  logInfo(...args) {
    if (this.depth && this.log.level >= Logger.INFO) {
      this.log.info(this.logIndent(), ...args)
    } else {
      this.log.info(...args)
    }
  }
  logWarn(...args) {
    if (this.depth && this.log.level >= Logger.WARN) {
      this.log.warn(this.logIndent(), ...args)
    } else {
      this.log.warn(...args)
    }
  }
  logError(...args) {
    if (this.depth && this.log.level >= Logger.ERROR) {
      this.log.error(this.logIndent(), ...args)
    } else {
      this.log.error(...args)
    }
  }


  // async buildPkg(pkg:Pkg)
  async buildPkg(pkg) {
    // Register as built, or check if already built
    if (!this.registerBuiltPkg(pkg)) {
      return  // already built
    }

    let outdatedDeps = []

    if (pkg.files[0].indexOf('__precompiled') === 0) {
      this.logInfo('using precompiled package', this.log.style.boldGreen(pkg.id))

      // This is a precompiled package
      pkg.module = new PrecompiledIRModule(
        pkg.dir + '/' + PrecompiledIRModule.sourceFileForTarget(pkg.files, this.target)
      );

      // TODO: register any dependencies for this precompiled package,
      // and populate outdatedDeps with outdated deps.

    } else {
      this.logInfo('building source package', this.log.style.boldGreen(pkg.id))

      // This is a regular source package.
      // Load source files
      var srcfiles = await pkg.loadSrcFiles();

      // build IR module
      pkg.module = await this.buildIRModule(pkg, srcfiles);
    }

    // Resolve any dependencies and register with pkg
    [pkg.deps, outdatedDeps] = await this.resolvePkgDeps(pkg);

    // Build any out-of-date deps
    if (outdatedDeps.length !== 0) {
      // Derive context with +1 depth
      let ctx = Object.create(this, { depth:{value:this.depth+1, enumerable:true} });
      // for (let depPkg of outdatedDeps) { await ctx.buildPkg(depPkg) }
      await Promise.all(outdatedDeps.map(pkg => ctx.buildPkg(pkg)))
    }
  }


  async resolvePkgDeps(pkg) {
    var deps = [], outdatedDeps = []
    for (let pkgref of Object.keys(pkg.imports)) {
      let depPkg
      if (pkgref[0] === '.') {
        // optimization: we can derive pkgdir from relative import without I/O,
        // and look up if this has been built already.
        depPkg = this.getBuiltPkg(path.normalize(pkg.dir + '/' + pkgref))
      }
      if (!depPkg) {
        let importedAt, srcloc = null
        if ((importedAt = pkg.imports[pkgref]) && importedAt.length !== 0) {
          srcloc = SrcLocation(importedAt[0].node, importedAt[0].file)
        }
        depPkg = await pkg.pkgFromRef(pkgref, srcloc)
        let builtPkg = this.getBuiltPkg(depPkg.dir)
        if (builtPkg) {
          depPkg = builtPkg
        } else {
          outdatedDeps.push(depPkg)
        }
      }
      deps.push(depPkg)
    }
    return [deps, outdatedDeps]
  }


  // buildIRModule(pkg:Pkg, irModuleFile:string, srcfiles:SrcFile[]):IRModule
  async buildIRModule(pkg, srcfiles) {
    let irmod = new IRModule({ file: pkg.irModuleFile() })

    // Is the IR module outdated?
    if (!irmod.file || await this.isIRModuleOutdated(pkg, irmod, srcfiles)) {
      this.logDebug('compiling irmodule for pkg', this.log.style.boldGreen(pkg.id))

      // Compile package to IR module
      var compiler = new PkgCompiler(pkg)
      var irmod2 = await compiler.compile(srcfiles)
      irmod.code = irmod2.code
      irmod.map = irmod2.map

      // Write intermediate code
      if (irmod.file) {
        this.logDebug(
          'write IR module', this.log.style.boldMagenta(irmod.file),
          'for package', this.log.style.boldGreen(pkg.id)
        )

        await WriteCode(irmod.code, irmod.map, irmod.file)
      }

      // Clear stat (which might relate to old irmodule code)
      irmod.stat = null
    } else {
      this.logDebug('reusing up-to-date IR module for pkg', this.log.style.boldGreen(pkg.id))
    }

    return irmod
  }


  async isIRModuleOutdated(pkg, irmod, srcfiles) {
    // Note: file might be null if this is an intermediate dependency that for some
    // reason does not have a well-known "pkg" location.
    irmod.stat = await fs.stat(irmod.file)
    var pkgid = this.log.style.boldGreen(pkg.id)
    if (!irmod.stat) {
      // There's no module file
      return true
    } else if (srcfiles.some(sf => sf.st.mtime > irmod.stat.mtime)) {
      // some source file has changed since the module was built.
      this.logDebug('IR module is outdated (source files changed) for pkg', pkgid)
      return true
    }

    // Load code so that we get access to pkg.imports
    await irmod.load()
    var pkginfo
    try {
      pkginfo = Pkg.parsePkgInfo(irmod.code)
    } catch (err) {
      this.logWarn('error while loading IR module code:', err.message)
      return true
    }

    // Was there a different set of files used to build irmod?
    var files = pkg.files.slice()
    if (files.length !== pkginfo.files.length) {
      this.logDebug('IR module is outdated (number of source files differ) for pkg', pkgid)
      return true
    }
    files.sort()
    pkginfo.files.sort()
    for (let i = 0, L = files.length; i !== L; ++i) {
      if (files[i] !== pkginfo.files[i]) {
        this.logDebug('IR module is outdated (source files differ) for pkg', pkgid)
        return true
      }
    }

    // Set pkg.imports
    if (pkginfo.imports) {
      pkg.imports = {}
      for (let ref of pkginfo.imports) {
        pkg.imports[ref] = [] // empty "importedAt" list
      }
    }

    return false  // not outdated — is up-to-date
  }


}


async function WriteCode(code, sourcemap, outfile) {
  // Write module
  await fs.mkdirs(path.dirname(outfile))

  // Source map
  // B.line('# sourceMappingURL=' + this.pkg + '.js.map'),
  await Promise.all([
    fs.writeFile(outfile, code, {encoding:'utf8'}),
    fs.writeFile(outfile + '.map', JSON.stringify(sourcemap), {encoding:'utf8'})
  ])
}

