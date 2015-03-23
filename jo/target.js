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

class Target {
  static fromID(id, mode) {
    switch (mode) {
      case undefined: case null: mode = TARGET_MODE_RELEASE; break;
      case TARGET_MODE_RELEASE: case TARGET_MODE_DEV: break;
      default: throw new Error(`unknown target mode "${mode}"`)
    }
    switch (id.toLowerCase()) {
      case TARGET_BROWSER:                    return new BrowserTarget(TARGET_BROWSER, mode)
      case TARGET_BROWSER_WEBKIT || 'webkit': return new WebkitTarget(TARGET_BROWSER_WEBKIT, mode)
      case TARGET_NODEJS:                     return new NodeJSTarget(TARGET_NODEJS, mode)
      default: throw new Error(`unknown target identifier "${id}"`)
    }
  }

  constructor(id, mode) {
    this.id = id
    this.mode = mode
  }

  // targetForDependency:Target
  get targetForDependency() {
    return this;
  }

  get moduleType() {
    return 'ignore';  // common|ignore|system|umd
  }

  get transforms() {
    var transforms = [
      'utility.inlineEnvironmentVariables',  // process.env.FOO -> "value"
    ];

    // Transforms based on "debug" or "release" build settings:
    if (this.mode === TARGET_MODE_RELEASE) {
      transforms = transforms.concat([
        'utility.removeConsole',      // `console...` -> ``
        'utility.removeDebugger',     // `debugger` -> ``
        'utility.inlineExpressions',  // `5 * 1024` -> `5120`, `"a" === "a"` -> `true`, etc
        'utility.deadCodeElimination',
          // strips things like:
          //
          // if ("dev" === "dev") {
          //   lets_play();
          // } else {
          //   do_business();
          // }
          //
          // into
          // do_business();
      ]);
    } else { // dev
      transforms = transforms.concat([
        // 'es6.blockScopingTDZ',  // insert checks for "temporal-dead zone" referenced `let`
      ]);
    }

    return transforms;
  }

  get disabledTransforms() {
    return ['es6.modules']
  }


  // (pkgs:Pkg[], logger:Logger, output?:string)
  async make(pkgs, logger, output=null) {
    throw `Target.make not implemented for target ${this.id}`
  }


  // codegen(filename:string, code:string, map:SourceMap):Program
  codegen(filename, code, map) {
    process.env.JO_BUILD_MODE = this.mode;  // for __DEV__
    // Note: Can't "import" babel, as babel's interopRequire does weird things
    var product = require('babel').transform(code, {
      filename:          filename,
      // inputSourceMap:    map,
      sourceMap:         true,     // generate SourceMap
      sourceMapName:     'out.map',
      sourceRoot:        map.sourceRoot,
      code:              true,     // output JavaScript code
      ast:               false,    // output AST
      experimental:      true,     // enable things like ES7 features
      compact:           this.mode === TARGET_MODE_RELEASE,   // "minify"
      comments:          this.mode === TARGET_MODE_DEV,  // include comments in output
      returnUsedHelpers: false,    // return information on what helpers are needed/was added
      modules:           this.moduleType,
      optional:          this.transforms,
      blacklist:         this.disabledTransforms,
    })
    delete process.env.JO_BUILD_MODE;
    delete product.map.file;
    return product;
  }

}


class BrowserTarget extends Target {
  //
}


class WebkitTarget extends BrowserTarget {}
