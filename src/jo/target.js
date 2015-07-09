import {Unique} from './util'

const TARGET_BROWSER        = 'browser'
const TARGET_BROWSER_WEBKIT = 'browser-webkit'
const TARGET_NODEJS         = 'nodejs'

const TARGET_MODE_DEV       = 'dev'
const TARGET_MODE_RELEASE   = 'release'

var Targets = {};

// interface Program {
//   code:string
//   map:SourceMap
// }

// record TargetOptions {
//   logger:Logger
//   output:string = null
//   warningsAsErrors:bool = false
// }  preprocessed to:
type TargetOptions = {
  logger:Logger;
  output:string;
  warningsAsErrors:bool;
}
var TargetOptions = _$record("TargetOptions", {
  logger: undefined, // Logger
  output: null,      // string
  warningsAsErrors: false, // bool
});

// Global names
// Based on https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects
const GLOBAL_STD          = 1; // standard
const GLOBAL_DEPRECATED   = 2; // should not be used, causes log messages
const GLOBAL_UNSAFE       = 4; // dangerous to use, causes log messages
const GLOBAL_EXPERIMENTAL = 8; // might not be available or is an ES proposal

var globalJSNames = {
  // Values
  'Infinity':GLOBAL_STD,
  'NaN':GLOBAL_STD,
  'null':GLOBAL_STD,
  'undefined':GLOBAL_STD,

  // Functions
  'eval':GLOBAL_STD,
  'uneval':GLOBAL_UNSAFE,
  'isFinite':GLOBAL_STD,
  'isNaN':GLOBAL_STD,
  'parseFloat':GLOBAL_STD,
  'parseInt':GLOBAL_STD,
  'decodeURI':GLOBAL_STD,
  'decodeURIComponent':GLOBAL_STD,
  'encodeURI':GLOBAL_STD,
  'encodeURIComponent':GLOBAL_STD,
  'escape':GLOBAL_DEPRECATED,
  'unescape':GLOBAL_DEPRECATED,

  // Fundamental objects
  'Object':GLOBAL_STD,
  'Function':GLOBAL_STD,
  'Boolean':GLOBAL_STD,
  'Symbol ':GLOBAL_STD,
  'Error':GLOBAL_STD,
  'EvalError':GLOBAL_STD,
  'InternalError':GLOBAL_STD,
  'RangeError':GLOBAL_STD,
  'ReferenceError':GLOBAL_STD,
  'SyntaxError':GLOBAL_STD,
  'TypeError':GLOBAL_STD,
  'URIError':GLOBAL_STD,

  // Numbers and dates
  'Number':GLOBAL_STD,
  'Math':GLOBAL_STD,
  'Date':GLOBAL_STD,

  // Text processing
  'String':GLOBAL_STD,
  'RegExp':GLOBAL_STD,

  // Indexed collections
  'Array':GLOBAL_STD,
  'Int8Array':GLOBAL_STD,
  'Uint8Array':GLOBAL_STD,
  'Uint8ClampedArray':GLOBAL_STD,
  'Int16Array':GLOBAL_STD,
  'Uint16Array':GLOBAL_STD,
  'Int32Array':GLOBAL_STD,
  'Uint32Array':GLOBAL_STD,
  'Float32Array':GLOBAL_STD,
  'Float64Array':GLOBAL_STD,

  // Keyed collections
  'Map':GLOBAL_STD,
  'Set':GLOBAL_STD,
  'WeakMap':GLOBAL_STD,
  'WeakSet':GLOBAL_STD,

  // Vector collections
  'SIMD':GLOBAL_EXPERIMENTAL,

  // Structured data
  'ArrayBuffer':GLOBAL_STD,
  'DataView':GLOBAL_STD,
  'JSON':GLOBAL_STD,

  // Control abstraction objects
  'Promise':GLOBAL_STD,
  'Generator':GLOBAL_EXPERIMENTAL,
  'GeneratorFunction':GLOBAL_EXPERIMENTAL,

  // Reflection
  'Reflect':GLOBAL_EXPERIMENTAL,
  'Proxy':GLOBAL_EXPERIMENTAL,

  // Internationalization
  'Intl':GLOBAL_EXPERIMENTAL,

  // Other
  'arguments':GLOBAL_STD,
}

class Target {
  static create(id:string, mode:int, options:TargetOptions=TargetOptions.default) {
    switch (mode) {
      case undefined: case null: mode = TARGET_MODE_RELEASE; break;
      case TARGET_MODE_RELEASE: case TARGET_MODE_DEV: break;
      default: throw new Error(`unknown target mode "${mode}"`)
    }
    var TargetType = Targets[id.toLowerCase()];
    if (!TargetType) {
      throw new Error(
        `unknown target identifier "${id}" (available targets: ${Object.keys(Targets)})`
      )
    }
    return new TargetType(id, mode, options);
  }

  constructor(id, mode, options) {
    this.id = id;
    this.mode = mode;
    this.options = options;
    this.globals = {__proto__:globalJSNames};
    this.builtInModuleRefs = {};
    if (options.globals && options.globals instanceof Array) {
      for (let globalName of options.globals) {
        this.globals[globalName] = 1;
      }
    }
  }

  registerGlobals(globals) {
    globals.__proto__ = this.globals;
    this.globals = globals;
  }

  registerBuiltInModules(refs) {
    refs.forEach(ref => {
      this.builtInModuleRefs[ref] = true;
    });
  }

  get log() {
    return this.options.logger
  }

  get isDevMode() {
    return this.mode === TARGET_MODE_DEV;
  }

  // targetForDependency:Target
  get targetForDependency() {
    return this;
  }

  get moduleType() {
    return 'ignore';  // common|ignore|system|umd
  }

  get pkgDirName() {
    return this.id + '.' + this.mode;
  }

  moduleForPackage(pkg:Pkg, depLevel:int) {
    // Override this to return an alternate module for a package
    return new Module({ file: this.moduleFilename(pkg, depLevel) });
  }


  moduleFilename(pkg:Pkg, depLevel:int) {
    // return null to indicate that the module should not be stored.
    if (pkg.jopath && pkg.ref) {
      return pkg.jopath + '/pkg/' + this.pkgDirName + '/' + pkg.ref + '/index.js'
    }
    return WorkDir.path + '/' +
      ( pkg.ref ? 'pkg/' + this.pkgDirName + '/' + pkg.ref :
                  'pkgdir/' + this.pkgDirName + pkg.dir ) + '.js'
  }


  precompiledModuleFilename(pkg:Pkg, depLevel:int) {
    return this.moduleFilename(pkg, depLevel);
  }


  transforms(transforms) {
    // Transforms based on "debug" or "release" build settings:
    if (this.mode === TARGET_MODE_RELEASE) {
      transforms = transforms.concat([
        'minification.deadCodeElimination',
        // 'minification.constantFolding',
        // 'minification.memberExpressionLiterals',
        // 'minification.propertyLiterals',
        // 'minification.removeConsole',
        'minification.removeDebugger',
      ]);
    } //else { // dev
      // TODO: sometime in the future, allow an "analyze" option, enabling things like TDZ and
      // maybe even run Flow on the code.
      // transforms = transforms.concat([
      //   'es6.blockScopingTDZ',  // insert checks for "temporal-dead zone" referenced `let`
      // ]);
    //}

    return transforms
  }


  disabledTransforms(disabledTransforms) {
    return disabledTransforms
  }


  resolveRequiredRuntimeModules(pkg:Pkg) {
    var runtimeModules = [];
    var visited = {};
    var visit = function(pkg) {
      if (pkg.dir in visited) return;
      visited[pkg.dir] = true;
      let runtimeMods = pkg.pkgInfo ? pkg.pkgInfo['babel-runtime'] : null;
      if (runtimeMods) {
        runtimeModules = runtimeModules.concat(runtimeMods);
      }
      for (let depPkg of pkg.deps) {
        visit(depPkg);
      }
    };
    visit(pkg);
    return Unique(runtimeModules);
  }


  runtimeHelperSourceFilename(ref) {
    var basedir = Env.JOROOT + '/node_modules/babel-runtime/';
    if (ref === 'regenerator') {
      return basedir + 'regenerator/runtime.js';
    } else {
      return basedir + ref + '.js';
    }
  }

  // Allows modifying the code of precompiled modules
  //filterPrecompiledModuleCode(pkg:Pkg, code:string):string {}

  // preMake is called before any packages are built
  //async preMake(pkgs) {}

  // Allows adding any code to the beginning and/or end of a package's module code
  //pkgModuleHeader(pkg:Pkg, depLevel:int):string {}
  //pkgModuleFooter(pkg:Pkg, depLevel:int):string {}

  // postCompile iscalled after a package has been compiled, but before it's written
  // to disk. The package has a valid and complete Module at this time. You might modify
  // the module code and/or source map.
  // postCompile(pkg:Pkg, depLevel:int) {}

  // postMake is called after all packages and dependencies have been successfully compiled.
  // The target might choose to perform some kind of post-processing at this stage. Or not.
  // (pkgs:Pkg[])
  //async postMake(pkgs) {}

}
