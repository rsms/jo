import {Unique} from './util'

const TARGET_BROWSER        = 'browser'
const TARGET_BROWSER_WEBKIT = 'browser-webkit'
const TARGET_NODEJS         = 'nodejs'

const TARGET_MODE_DEV       = 'dev'
const TARGET_MODE_RELEASE   = 'release'

var Targets = {}

// interface Program {
//   code:string
//   map:SourceMap
// }

function _$record(name, prototype) {
  var toString = function(){
    return "<record "+this.__name+" "+JSON.stringify(this)+">";
  };
  Object.defineProperties(prototype, {
    __name: {value:name},
    toString: {value:toString},
  });
  Object.freeze(prototype);
  var record = function(properties) {
    var k, v, props = {};
    for (k in properties) {
      v = props[k];
      if (v !== undefined) {
        props[k] = {value:v, enumerable:true, configurable:true};
      } else if (!(k in prototype)) {
        throw new Error('unexpected property '+JSON.stringify(k)+' assigned to record '+name);
      }
    }
    return Object.create(prototype, props);
  };
  record.default = prototype;
  return record;
}

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

// Most of these come from
// https://raw.githubusercontent.com/douglascrockford/JSLint/master/jslint.js
var globalJSNames = {};
[ 'Array', 'Boolean', 'Date', 'decodeURI', 'decodeURIComponent',
  'encodeURI', 'encodeURIComponent', 'Error', 'eval', 'EvalError',
  'Function', 'isFinite', 'isNaN', 'JSON', 'Map', 'Math', 'Number',
  'Object', 'parseInt', 'parseFloat', 'Promise', 'Proxy',
  'RangeError', 'ReferenceError', 'Reflect', 'RegExp', 'Set',
  'String', 'Symbol', 'SyntaxError', 'System', 'TypeError',
  'URIError', 'WeakMap', 'WeakSet',

  'undefined', 'arguments',
].forEach(name => { globalJSNames[name] = 1 });

class Target {
  static create(id:string, mode:int, options:TargetOptions=TargetOptions.default) {
    switch (mode) {
      case undefined: case null: mode = TARGET_MODE_RELEASE; break;
      case TARGET_MODE_RELEASE: case TARGET_MODE_DEV: break;
      default: throw new Error(`unknown target mode "${mode}"`)
    }
    var t;
    switch (id.toLowerCase()) {
      case TARGET_BROWSER:                    t = new BrowserTarget(id, mode, options);break;
      case TARGET_BROWSER_WEBKIT || 'webkit': t = new WebkitTarget(id, mode, options); break;
      case TARGET_NODEJS:                     t = new NodeJSTarget(id, mode, options); break;
      default: throw new Error(`unknown target identifier "${id}"`)
    }
    return t;
  }

  constructor(id, mode, options) {
    this.id = id;
    this.mode = mode;
    this.options = options;
    this.globals = {__proto__:globalJSNames};
    if (options.globals && options.globals instanceof Array) {
      for (let globalName of options.globals) {
        this.globals[globalName] = 1;
      }
    }
  }

  registerGlobals(globals) {
    globals.forEach(id => {
      this.globals[id] = true;
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
        'utility.removeConsole',       // `console...` -> ``
        'utility.removeDebugger',      // `debugger` -> ``
        'utility.inlineExpressions',   // `5 * 1024` -> `5120`, `"a" === "a"` -> `true`, etc
        'utility.deadCodeElimination', // `if (0) { foo(); } else { bar(); }` -> `bar();`
      ]);
    } else { // dev
      transforms = transforms.concat([
        'es6.blockScopingTDZ',  // insert checks for "temporal-dead zone" referenced `let`
      ]);
    }

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
    var basedir = Env.JOROOT + '/jo/node_modules/babel-runtime/';
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

