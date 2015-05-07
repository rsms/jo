
// interface Module {
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
      pkg.module = new PrecompiledModule(
        pkg.dir + '/' + PrecompiledModule.sourceFileForTarget(pkg.files, this.target)
      );

      // TODO: register any dependencies for this precompiled package,
      // and populate outdatedDeps with outdated deps.

      // Copy module
      let targetFilename = this.target.precompiledModuleFilename(pkg, this.depth);
      if (targetFilename && targetFilename !== pkg.module.file) {
        await pkg.module.copyToIfOutdated(targetFilename, pkg, this.target);
      }

    } else {
      this.logInfo('building source package', this.log.style.boldGreen(pkg.id))

      // This is a regular source package.
      // Load source files
      var srcfiles = await pkg.loadSrcFiles();

      // build module
      pkg.module = await this.buildModule(pkg, srcfiles);
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

    // Check imported names
    // TODO:
    //   for imp in pkg:
    //     for name in imp:
    //       assert (name in pkg.deps[imp.ref].pkginfo.exported)
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
          srcloc = SrcLocation(importedAt.nodes[0], importedAt.nodes[0].srcfile)
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


  // buildModule(pkg:Pkg, srcfiles:SrcFile[]):Module
  async buildModule(pkg, srcfiles) {
    let mod = new Module({ file: this.target.moduleFilename(pkg, this.depth) });

    // Is the module outdated?
    if (!mod.file || await this.isModuleOutdated(pkg, mod, srcfiles)) {
      this.logDebug('compiling module for pkg', this.log.style.boldGreen(pkg.id))

      // Compile package to module
      var compiler = new PkgCompiler(pkg, mod, this.target)
      var compiled = await compiler.compile(srcfiles)
      mod.code = compiled.code
      mod.map = compiled.map

      // Write intermediate code
      if (mod.file) {
        this.logDebug(
          'write module', this.log.style.boldMagenta(mod.file),
          'for package', this.log.style.boldGreen(pkg.id)
        )
        await WriteCode(mod.code, mod.map, mod.file)
      }

      // Clear stat (which might relate to old module code)
      mod.stat = null
    } else {
      this.logDebug('reusing up-to-date module for pkg', this.log.style.boldGreen(pkg.id))
    }

    return mod
  }


  async isModuleOutdated(pkg, mod, srcfiles) {
    // Note: file might be null if this is an intermediate dependency that for some
    // reason does not have a well-known "pkg" location.
    mod.stat = await fs.stat(mod.file)
    var pkgid = this.log.style.boldGreen(pkg.id)
    if (!mod.stat) {
      // There's no module file
      return true
    } else if (srcfiles.some(sf => sf.st.mtime > mod.stat.mtime)) {
      // some source file has changed since the module was built.
      this.logDebug('module is outdated (source files changed) for pkg', pkgid)
      return true
    }

    // Load code so that we get access to pkg.imports
    await mod.load()
    var pkginfo
    try {
      pkginfo = Pkg.parsePkgInfo(mod.code)
      pkg.pkgInfo = pkginfo;
    } catch (err) {
      this.logWarn('error while loading module code:', err.message)
      return true
    }

    // Was there a different set of files used to build mod?
    var files = pkg.files.slice()
    if (files.length !== pkginfo.files.length) {
      this.logDebug('module is outdated (number of source files differ) for pkg', pkgid)
      return true
    }
    files.sort()
    pkginfo.files.sort()
    for (let i = 0, L = files.length; i !== L; ++i) {
      if (files[i] !== pkginfo.files[i]) {
        this.logDebug('module is outdated (source files differ) for pkg', pkgid)
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

