import 'path'

class NodeJSTarget extends Target {
  constructor(id, mode, options) {
    super(id, mode, options);
    this.registerGlobals({
      'setImmediate':GLOBAL_STD,
      'setInterval':GLOBAL_STD,
      'setTimeout':GLOBAL_STD,
      'clearImmediate':GLOBAL_STD,
      'clearInterval':GLOBAL_STD,
      'clearTimeout':GLOBAL_STD,
      'Buffer':GLOBAL_STD,
      'console':GLOBAL_STD,
      'exports':GLOBAL_STD,
      'global':GLOBAL_STD,
      'module':GLOBAL_STD,
      'process':GLOBAL_STD,
      'require':GLOBAL_STD,
      '__dirname':GLOBAL_STD,
      '__filename':GLOBAL_STD,
    });
    this.registerBuiltInModules([
      'assert',
      'buffer',
      'child_process',
      'cluster',
      'console',
      'constants',
      'crypto',
      'dgram',
      'dns',
      'domain',
      'events',
      'freelist',
      'fs',
      'http',
      'https',
      'module',
      'net',
      'os',
      'path',
      'punycode',
      'querystring',
      'readline',
      'repl',
      'smalloc',
      'stream',
      'string_decoder',
      'sys',
      'timers',
      'tls',
      'tty',
      'url',
      'util',
      'vm',
      'zlib',
    ]);
  }

  get moduleType() {
    return 'common'
  }


  async preMake(pkgs:Pkg[]) {
    if (!pkgs[0].jopath) {
      var pkgdir = path.resolve(pkgs[0].dir);
      this.localNodeModulesDir = pkgdir ? pkgdir + '/node_modules' : null;
    }
  }


  testModuleForPackage(pkg:Pkg) {
    return new TestModule();
  }


  moduleForPackage(pkg:Pkg, depLevel:int) { //:Module
    let filename = null;
    if (!pkg.jopath) {
      if (depLevel !== 0 && this.localNodeModulesDir) {
        filename = this.localNodeModulesDir + '/' +
                   (pkg.ref ? pkg.ref : path.resolve(pkg.dir).pop()) + '.js';
      }
    } else {
      filename = super.moduleFilename(pkg, depLevel);
    }
    return new Module({ filename: filename });
  }


  transforms(transforms) {
    return super.transforms(transforms).concat([
      'asyncToGenerator',  // async/await on yield. Requires Node.js >0.11.2
    ])
  }

  disabledTransforms(disabledTransforms) {
    return super.disabledTransforms(disabledTransforms).concat([
      'spec.protoToAssign', // x.__proto__ = y supported by v8, no need to shallow-copy
      'es6.spec.blockScoping', // supported by v8
      'es6.spec.symbols',      // supported by v8
      'regenerator',           // b/c yield is supported by v8
    ])
  }


  preBuildModule(pkg:Pkg, module:Module, srcfiles:SrcFile[], depLevel:int) {
    console.log('preBuildModule: module.info:', module.info)
  }


  preCompileModule(pkg:Pkg, module:Module, srcfiles:SrcFile[], depLevel:int) {
    if (depLevel === 0) {
      if (!pkg.testModule && module.hasMainFunc) {
        // We are not building a test program and the module has a main function
        module.program = new NodeJSProgram(pkg, module, srcfiles, this);
      } else if (pkg.testModule && module === pkg.testModule) {
        // We are building a test program and this is the test module
        module.program = new NodeJSTestProgram(pkg, module, srcfiles, this);
      }
    }
  }


  async postCompileModule(pkg:Pkg, module:Module, srcfiles:SrcFile[], depLevel:int) {
    if (module.program) {
      pkg.programs.push(module.program);
    } else {
      return super.postCompileModule(pkg, module, srcfiles, depLevel)
    }
  }


  async postMake(pkgs:Pkg[]) {
    let programs = pkgs.reduce((v, pkg) => v ? v.concat(pkg.programs) : pkg.programs, null)
    if (programs.length !== 0) {
      return Promise.all(programs.map(program => program.write()))
    }
  }

}

function init() {
  Targets['nodejs'] = NodeJSTarget;
}
