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
    this.globals = {'this':1, 'undefined':1, 'arguments':1};
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


  moduleFilename(pkg:Pkg, depLevel:int) {
    // return null to indicate that the module should not be stored.
    if (this.options.output && depLevel === 0) {
      // Assume whatever set "output" made sure there's only one top-level
      // package. Now, return "output" for that top-level package `pkg`.
      return this.options.output;
    }
    let t = this.id + '.' + this.mode
    if (pkg.jopath && pkg.ref) {
      return pkg.jopath + '/pkg/' + t + '/' + pkg.ref + '/index.js'
    }
    return WorkDir.path + '/' +
      ( pkg.ref ? 'pkg/' + t + '/' + pkg.ref :
                  'pkgdir/' + t + pkg.dir ) + '.js'
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


  // postMake is called after all packages and dependencies have been successfully compiled.
  // The target might choose to perform some kind of post-processing at this stage. Or not.
  // (pkgs:Pkg[])
  async postMake(pkgs) {
  }

}


class BrowserTarget extends Target {
  //
}


class WebkitTarget extends BrowserTarget {}
