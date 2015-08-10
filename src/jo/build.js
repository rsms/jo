import {SrcLocation} from './util'
import path from 'path'
import {Duration} from 'time'
import 'assert'

// interface Module {
//   file?string
//   code?:string
//   map?:SourceMap
//   stat?:fs.Stat
// }

const kSpaces = '                                                                              ';
var slice = Array.prototype.slice;

// const moduleStatus = enum {OwnSourceChanged, ProgramDepsChanged, UpToDate};
const moduleStatus = {
  OwnSourceChanged:   Symbol('OwnSourceChanged'),
  ProgramDepsChanged: Symbol('ProgramDepsChanged'),
  UpToDate:           Symbol('UpToDate'),
};

class BuildCtx {
  constructor(target, logger, options) {
    this.log = logger
    this.target = target
    this.options = options || {forceRebuild: false};
    this.builtPkgs = {}  // {pkgdir: Pkg} -- packages built in this context
    this.depth = 0
    this.pkgs = [] // Pkg[]
  }

  get buildTests() {
    return (this.depth === 0 && this.options.buildTests);
  }

  registerBuiltPkg(pkg) {
    let existingPkg = this.builtPkgs[pkg.dir];
    if (existingPkg) {
      return existingPkg
    }
    this.builtPkgs[pkg.dir] = pkg
    return null
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


  async buildPkg(pkg) {
    // Register as built, or check if already built
    let existingPkg = this.registerBuiltPkg(pkg);
    if (existingPkg) {
      return existingPkg // already built
    }

    // if (pkg.id === 'bar/enum') {
    //   // let w = Worker.spawn('buildpkg', {pkg:pkg, target:this.target, options:this.options})
    //   let c = _$rt.jo_spawnt(function() {
    //     return async function(chan) {
    //       while(true) {
    //         console.log('[task] calling await '+chan+'.recv()');
    //         let msg = await chan.recv()
    //         console.log('[task] '+chan+'.recv() => ' + msg);
    //         if (msg === 'done') {
    //           break;
    //         }
    //         console.log('[task] calling '+chan+'.send()');
    //         chan.send('pong 1/2: ' + msg);
    //         chan.send('pong 2/2: ' + msg);
    //       }
    //       // console.log('[task] calling '+chan+'.send("msg1")');
    //       // chan.send('msg1');
    //       // console.log('[task] calling '+chan+'.send("msg2")');
    //       // chan.send('msg2');
    //     }
    //   });
    //   console.log('** spawned task');

    //   console.log('** calling '+c+'.send("msg0")')
    //   c.send('msg0');

    //   console.log('** calling await '+c+'.recv()')
    //   let m = await c.recv();
    //   console.log('** '+c+'.recv() =>', m)
    //   console.log('** calling await '+c+'.recv()')
    //   m = await c.recv();
    //   console.log('** '+c+'.recv() =>', m)

    //   c.send('done');

    //   // let p = c.recv();
    //   // p.then(m => {
    //   //   console.log('** '+c+'.recv() =>', m)
    //   //   process.exit(6);
    //   // }).catch(e => {
    //   //   console.log('** '+c+'.recv() =x', e)
    //   //   process.exit(6);
    //   // });
      
    //   // c.send('message2 from main');

    //   await new Promise(()=>{});
    //   // console.log('c.recv() =>', await c.recv())
    //   // console.log('c.recv() =>', await c.recv())
    //   process.exit(5)
    // }

    let timeStarted = Date.now()
    let outdatedDeps = []
    let pkgIdString = this.log.style.boldGreen(pkg.id);

    if (pkg.files[0].indexOf('__precompiled') === 0) {
      this.logInfo('using precompiled package', pkgIdString)

      // This is a precompiled package
      pkg.module = new PrecompiledModule(
        pkg.dir + '/' + PrecompiledModule.sourceFileForTarget(pkg.files, this.target)
      );

      // TODO: register any dependencies for this precompiled package,
      // and populate outdatedDeps with outdated deps.

      // Copy module
      let targetFilename = this.target.precompiledModuleFilename(pkg, this.depth);
      if (targetFilename && targetFilename !== pkg.module.filename) {
        await pkg.module.copyToIfOutdated(targetFilename, pkg, this.target);
      }

    } else {
      this.logInfo('building source package', pkgIdString)

      // This is a regular source package.
      // Load source files
      var srcfiles = await pkg.loadSrcFiles({includeTests:this.buildTests});

      // build module
      await this.buildModules(pkg, srcfiles); // Note: sets pkg.module and pkg.testModule
    }

    let timeFinished = Date.now();

    // Resolve any dependencies and register with pkg
    [pkg.deps, outdatedDeps] = await this.resolvePkgDeps(pkg, Object.keys(pkg.imports));

    // Build any out-of-date deps
    if (outdatedDeps.length !== 0) {
      // Derive context with +1 depth
      let ctx = Object.create(this, { depth:{value:this.depth+1, enumerable:true} });
      await Promise.all(outdatedDeps.map(pkg => ctx.buildPkg(pkg)))
    }

    // Deduplicate
    pkg.deps = pkg.deps.map(pkg => {
      return this.builtPkgs[pkg.dir] || pkg;
    });

    // Log "built package" message
    if (this.log.level >= Logger.INFO) {
      let depTime = Date.now() - timeFinished;
      let timeStr = this.log.style.grey(
        '(' + Duration.format(timeFinished - timeStarted) +
        ((depTime > 1) ?  ' + ' + Duration.format(depTime) : '') + ')'
      );
      this.logInfo('built package', pkgIdString, timeStr);
    }

    return pkg;
  }


  async resolvePkgDeps(pkg, refs) {
    var deps = [], outdatedDeps = []
    for (let pkgref of refs) {
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
        depPkg = await pkg.pkgFromRef(pkgref, srcloc, this.target)
        if (!depPkg.isBuiltIn && !depPkg.isNPM) {
          let builtPkg = this.getBuiltPkg(depPkg.dir)
          if (builtPkg) {
            depPkg = builtPkg
          } else {
            outdatedDeps.push(depPkg)
          }
        }
      }
      deps.push(depPkg)
    }
    return [deps, outdatedDeps]
  }


  setupPackageModules(pkg:Pkg) {
    // Std module
    if (!pkg.module) {
      pkg.module = this.target.moduleForPackage(pkg, this.depth);
    }

    // Test module
    if (this.buildTests) {
      if (!pkg.testModule) {
        pkg.testModule = this.target.testModuleForPackage(pkg, this.depth);
      }
    }
  }


  moduleSrcfilesForPkg(pkg:Pkg, srcfiles:SrcFile[]) {
    let stdSrcFiles = srcfiles;
    let testSrcFiles = [];
    if (pkg.testModule) {
      stdSrcFiles = [];
      testSrcFiles = [];
      srcfiles.forEach(f => {
        if (f.isTest) {
          testSrcFiles.push(f)
        } else {
          stdSrcFiles.push(f)
        }
      });
    }
    return [stdSrcFiles, testSrcFiles];
  }


  async moduleStatus(pkg:Pkg, mod:Module, srcfiles:SrcFile[]) {
    // Is the module outdated?
    if (this.options.forceRebuild ||
        !mod.filename ||
        mod.filename === '-' ||
        await this.isModuleOutdated(pkg, mod, srcfiles))
    {
      return moduleStatus.OwnSourceChanged;
    } else if (this.depth === 0 && await this.isModuleOutdatedProgram(pkg, mod)) {
      return moduleStatus.ProgramDepsChanged;
    } else {
      return moduleStatus.UpToDate;
    }
  }


  async buildModules(pkg:Pkg, srcfiles:SrcFile[]) {
    this.setupPackageModules(pkg);
    let [stdSrcFiles, testSrcFiles] = this.moduleSrcfilesForPkg(pkg, srcfiles);
    let pkgIdString = this.log.style.boldGreen(pkg.id);

    // Run target.preBuildModule
    // this.target.preBuildModule(pkg, pkg.module, stdSrcFiles, this.depth)
    // TODO: must allow program to be re-generated if any dep changed
    // if isProgram and program.stat.mtime < max(deps.mtime) then outdated!

    // TODO: let stdModStatus = this.moduleStatus(pkg, pkg.module, stdSrcFiles);

    // Is the module outdated?
    if (this.options.forceRebuild ||
        !pkg.module.filename ||
        pkg.module.filename === '-' ||
        await this.isModuleOutdated(pkg, pkg.module, stdSrcFiles))
    {
      await this.compileModule(pkg, pkg.module, stdSrcFiles)
    } else if (this.depth === 0 && await this.isModuleOutdatedProgram(pkg, pkg.module)) {
      this.logDebug('updating program module for pkg', pkgIdString)
      this.target.preCompileModule(pkg, pkg.module, stdSrcFiles, this.depth);
      // --TODO--
    } else {
      this.logDebug('reusing up-to-date module for pkg', pkgIdString)
      pkg.imports = Pkg.importsFromModuleInfo(pkg.module.info)
    }

    // Is the test module outdated?
    if (pkg.testModule) {
      if (this.options.forceRebuild ||
          !pkg.testModule.filename ||
          pkg.testModule.filename === '-' ||
          await this.isModuleOutdated(pkg, pkg.testModule, testSrcFiles))
      {
        let basedOn = {module:pkg.module, srcfiles:stdSrcFiles};
        await this.compileModule(pkg, pkg.testModule, testSrcFiles, basedOn);

        // Test modules must not contain a main function
        if (pkg.testModule.info.main) {
          throw new Error('test can not contain a main function')
        }

        // Add any additional imports from test module.
        // pkg.imports are later used to infer dependencies. This enabled importing something
        // in a test and have that dependency automatically built.
        let testImports = Pkg.importsFromModuleInfo(pkg.testModule.info);
        if (testImports) {
          pkg.imports = Pkg.mergeImports(pkg.imports, testImports);
        }
      } else {
        this.logDebug('reusing up-to-date test module for pkg', pkgIdString)
      }
    }
  }


  async compileModule(pkg:Pkg, module:Module, srcfiles:SrcFile[], basedOn?) {
    if (this.log.level >= Logger.DEBUG) {
      this.logDebug('compiling', module.typeName,
                    'for package', this.log.style.boldGreen(pkg.id))
    }

    // Note: target.preCompileModule is run by ModuleCompiler.compile

    var compiler = new ModuleCompiler(pkg, module, basedOn, this.target, this.depth)
    var codebuf = await compiler.compile(srcfiles)
    module.code = codebuf.code;
    module.map = codebuf.map.toJSON();
    module.stat = null;  // Clear stat (which might relate to old module code)

    // postCompileModule potentially writes the module to disk
    await this.target.postCompileModule(pkg, module, srcfiles, this.depth)
  }


  async isModuleOutdated(pkg:Pkg, mod:Module, srcfiles:SrcFile[]) {
    // Note: file might be null if this is an intermediate dependency that for some
    // reason does not have a well-known "pkg" location.
    var pkgid = this.log.style.boldGreen(pkg.id)
    if (!await mod.loadStat()) {
      // There's no module file
      return true
    } else if (srcfiles.some(sf => sf.st.mtime > mod.stat.mtime)) {
      // some source file has changed since the module was built.
      this.logDebug('module is outdated (source files changed) for pkg', pkgid)
      return true
    }

    // Load code so that we get access to pkg.imports
    try {
      await mod.load()
    } catch (err) {
      this.logWarn('error while loading module code:', err.message)
      return true
    }
    if (__DEV__) { assert(mod.info !== null); }

    // Was there a different set of files used to build mod?
    var files = srcfiles.map(f => f.name)
    if (files.length !== mod.info.files.length) {
      this.logDebug('module is outdated (number of source files differ) for pkg', pkgid)
      return true
    }
    files.sort();
    mod.info.files.sort();
    for (let i = 0, L = files.length; i !== L; ++i) {
      if (files[i] !== mod.info.files[i]) {
        this.logDebug('module is outdated (source files differ) for pkg', pkgid)
        return true
      }
    }

    return false  // not outdated — is up-to-date
  }


  async isModuleOutdatedProgram(pkg:Pkg, mod:Module) {
    if (__DEV__) { assert(mod.info !== null); }
    // At this point, we know the module is up-to-date compared to its source files, but
    // any newer dependency should trigger generation of the program.
    // First we see if any dependencies are newer.
    if (mod.info.main) {
      // Resolve any dependencies and register with pkg
      let outdatedDeps;
      [pkg.deps, outdatedDeps] = await this.resolvePkgDeps(pkg, mod.info.imports);
      let rootModMTime = mod.stat.mtime;
      let foundModifiedPkg = null;
      await Promise.all(pkg.deps.map(async (pkg) => {
        if (!foundModifiedPkg) {
          ({__proto__:this, buildTests:false}).setupPackageModules(pkg);
          await pkg.module.load();
          if (!pkg.module.stat) {
            console.log('no stat for module of package', pkg.id)
          }
          if (rootModMTime < pkg.module.stat.mtime) {
            foundModifiedPkg = pkg;
          }
        }
      }));
      // console.log(
      //   'isModuleOutdatedProgram: foundModifiedPkg:',
      //   foundModifiedPkg ? foundModifiedPkg.id : 'null'
      // )
      if (foundModifiedPkg) {
        return true;
      }
    }
    return false;
  }


}
