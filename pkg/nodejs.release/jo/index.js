//#jopkg{"files":["build.js","cmd-build.js","cmd-env.js","cmd-remotectrl.js","codebuf.js","compile.js","env.js","jo.js","logger.js","module.js","pkg.js","preprocessor.js","srcfile.js","target.js","target_browser.js","target_nodejs.js","tokenizer.js","toposort.js","workdir.js","writecode.js"],"imports":["asyncfs","path","os","./util","npmjs.com/source-map","npmjs.com/babel","npmjs.com/babel/lib/babel/transformation/file","npmjs.com/babel/lib/babel/transformation/transformer","npmjs.com/babel/lib/babel/generation","./transformers","./remotectrl"],"exports":["BuildCtx","BuildCmd","EnvCmd","RemoteControlCmd","CodeBuffer","ExportError","ReferenceError","CyclicReferenceError","PkgCompiler","Env","Mainv","Commands","Logger","Module","PrecompiledModule","Pkg","BuiltInPkg","NPMPkg","TokenEditor","Preprocessor","SrcFile","TARGET_BROWSER","TARGET_BROWSER_WEBKIT","TARGET_NODEJS","TARGET_MODE_DEV","TARGET_MODE_RELEASE","Targets","TargetOptions","GLOBAL_STD","GLOBAL_DEPRECATED","GLOBAL_UNSAFE","GLOBAL_EXPERIMENTAL","Target","BrowserTarget","NodeJSTarget","Tokenizer","WorkDir"],"babel-runtime":["helpers/async-to-generator","core-js","helpers/class-call-check","helpers/create-class","helpers/inherits","helpers/get","helpers/sliced-to-array","helpers/define-property"],"version":"ibvq2pme"}
var _asyncToGenerator = __$irt("babel-runtime/helpers/async-to-generator")
  , _core = __$irt("babel-runtime/core-js")
  , _classCallCheck = __$irt("babel-runtime/helpers/class-call-check")
  , _createClass = __$irt("babel-runtime/helpers/create-class")
  , _inherits = __$irt("babel-runtime/helpers/inherits")
  , _get = __$irt("babel-runtime/helpers/get")
  , _slicedToArray = __$irt("babel-runtime/helpers/sliced-to-array")
  , _defineProperty = __$irt("babel-runtime/helpers/define-property")
  , _writecode_js$fs = __$im(require,"asyncfs")
  , _workdir_js$fs = _writecode_js$fs
  , _module_js$fs = _writecode_js$fs
  , _env_js$fs = _writecode_js$fs
  , _target_nodejs_js$fs = _writecode_js$fs
  , _target_browser_js$fs = _writecode_js$fs
  , _pkg_js$fs = _writecode_js$fs
  , _preprocessor_js$fs = _writecode_js$fs
  , _compile_js$fs = _writecode_js$fs
  , _build_js$fs = _writecode_js$fs
  , _cmd_build_js$fs = _writecode_js$fs
  , _writecode_js$path = __$i(require("path"))
  , _module_js$path = _writecode_js$path
  , _env_js$path = _writecode_js$path
  , _target_nodejs_js$path = _writecode_js$path
  , _target_browser_js$path = _writecode_js$path
  , _pkg_js$path = _writecode_js$path
  , _codebuf_js$path = _writecode_js$path
  , _compile_js$path = _writecode_js$path
  , _build_js$path = _writecode_js$path
  , _cmd_build_js$path = _writecode_js$path
  , _jo_js$path = _writecode_js$path
  , _workdir_js$os = __$i(require("os"))
  , _$$0 = __$i(require("./util"))
  , _env_js$repr = _$$0.repr
  , _target_js$Unique = _$$0.Unique
  , _target_nodejs_js$Unique = _$$0.Unique
  , _pkg_js$SrcError = _$$0.SrcError
  , _logger_js$TermStyle = _$$0.TermStyle
  , _toposort_js$repr = _$$0.repr
  , _preprocessor_js$repr = _$$0.repr
  , _compile_js$JSIdentifier = _$$0.JSIdentifier
  , _compile_js$SrcError = _$$0.SrcError
  , _compile_js$SrcErrors = _$$0.SrcErrors
  , _compile_js$SrcLocation = _$$0.SrcLocation
  , _compile_js$repr = _$$0.repr
  , _compile_js$Unique = _$$0.Unique
  , _compile_js$LevenshteinDistance = _$$0.LevenshteinDistance
  , _compile_js$TermStyle = _$$0.TermStyle
  , _build_js$SrcLocation = _$$0.SrcLocation
  , _build_js$TermStyle = _$$0.TermStyle
  , _cmd_build_js$Unique = _$$0.Unique
  , _cmd_remotectrl_js$SrcError = _$$0.SrcError
  , _jo_js$ParseOpt = _$$0.ParseOpt
  , _jo_js$SrcError = _$$0.SrcError
  , _codebuf_js$sourceMap = __$i(require("source-map"))
  , _compile_js$babel = __$iw(require("babel"))
  , _compile_js$BabelFile = __$i(require("babel/lib/babel/transformation/file"))
  , _compile_js$Transformer = __$i(require("babel/lib/babel/transformation/transformer"))
  , _compile_js$BabelGen = __$i(require("babel/lib/babel/generation"))
  , _$$1 = __$i(require("./transformers"))
  , _compile_js$ModuleTransformer = _$$1.ModuleTransformer
  , _compile_js$FileLocalVarsTransformer = _$$1.FileLocalVarsTransformer
  , _compile_js$ClassHierarchyTransformer = _$$1.ClassHierarchyTransformer
  , _cmd_remotectrl_js$RemoteControl = __$i(require("./remotectrl")).RemoteControl;
"use strict";

var writeCode = _asyncToGenerator(function* (code, sourcemap, outfile) {
  var writeToStdout = arguments[3] === undefined ? false : arguments[3];

  if (!writeToStdout) {
    yield _writecode_js$fs.mkdirs(_writecode_js$path.dirname(outfile));
  }
  if (!sourcemap || sourcemap.inline || sourcemap.excluded) {
    if (sourcemap && !sourcemap.excluded) {
      var sourceMapReplacement = "";
      sourceMapReplacement = "//#sourceMappingURL=data:application/json;charset:utf-8;base64," + new Buffer(sourcemap.toString()).toString("base64");
      if (code.indexOf("\n//#sourceMappingURL=") !== -1) {
        code = code.replace(/\n\/\/#sourceMappingURL=.+\n/m, "\n" + sourceMapReplacement + "\n");
      } else {
        code += (code[code.length - 1] !== "\n" ? "\n" : "") + sourceMapReplacement + "\n";
      }
    } else {
      code.replace(/\n\/\/#sourceMappingURL=.+\n/m, "\n");
    }

    if (!writeToStdout) {
      yield _writecode_js$fs.writeFile(outfile, code, { encoding: "utf8" });
    }
  } else if (!writeToStdout) {
    yield _core.Promise.all([_writecode_js$fs.writeFile(outfile, code, { encoding: "utf8" }), _writecode_js$fs.writeFile(outfile + ".map", JSON.stringify(sourcemap), { encoding: "utf8" })]);
  }

  if (writeToStdout) {
    process.stdout.write(code);
  }
});
"use strict";

var WorkDir = {
  path: _workdir_js$os.tmpdir().replace(/\/*$/, "") + "/jo-work-" + Date.now().toString(36),
  ensureDir: _asyncToGenerator(function* (relname) {
    var dirname = this.path + "/" + relname;
    yield _workdir_js$fs.mkdirs(dirname);
    return dirname;
  }),

  enableRemoveAtExit: function enableRemoveAtExit() {
    process.on("exit", function () {
      try {
        removeSync(WorkDir.path);
      } catch (e) {}
    });
  } };

function removeSync(path) {
  var files = [];
  if (_workdir_js$fs.existsSync(path)) {
    files = _workdir_js$fs.readdirSync(path);
    files.forEach(function (file, index) {
      var curPath = path + "/" + file;
      if (_workdir_js$fs.lstatSync(curPath).isDirectory()) {
        removeSync(curPath);
      } else {
        _workdir_js$fs.unlinkSync(curPath);
      }
    });
    _workdir_js$fs.rmdirSync(path);
  }
}
"use strict";

var Module = (function () {
  function Module(_ref) {
    var _ref$file = _ref.file;
    var file = _ref$file === undefined ? null : _ref$file;
    var _ref$stat = _ref.stat;
    var stat = _ref$stat === undefined ? null : _ref$stat;
    var _ref$code = _ref.code;
    var code = _ref$code === undefined ? null : _ref$code;
    var _ref$map = _ref.map;
    var map = _ref$map === undefined ? null : _ref$map;

    _classCallCheck(this, Module);

    this.file = file ? file : null;
    this.stat = stat;
    this.code = code;
    this.map = map;
  }

  _createClass(Module, {
    load: {
      value: _asyncToGenerator(function* () {
        var m = this;
        if (!m.stat) {
          m.stat = yield _module_js$fs.stat(m.file);
        }
        if (!m.code) {
          m.code = yield _module_js$fs.readFile(m.file, { encoding: "utf8" });
        }
        if (!m.map) {
          try {
            m.map = JSON.parse((yield _module_js$fs.readFile(m.file + ".map", { encoding: "utf8" })));
          } catch (err) {
            if (err.code !== "ENOENT") {
              throw err;
            }
          }
        }
      })
    }
  });

  return Module;
})();

var PrecompiledModule = (function (_Module) {
  function PrecompiledModule(file) {
    _classCallCheck(this, PrecompiledModule);

    _get(_core.Object.getPrototypeOf(PrecompiledModule.prototype), "constructor", this).call(this, { file: file });
  }

  _inherits(PrecompiledModule, _Module);

  _createClass(PrecompiledModule, {
    copyToIfOutdated: {
      value: _asyncToGenerator(function* (dstFilename, pkg, target) {
        var _this = this;

        var dstStat;

        var _ref = yield _core.Promise.all([dstFilename, this.file].map(function (f) {
          return _module_js$fs.stat(f);
        }));

        var _ref2 = _slicedToArray(_ref, 2);

        dstStat = _ref2[0];
        this.stat = _ref2[1];

        if (dstStat && this.stat.mtime <= dstStat.mtime) {
          return;
        }

        yield _module_js$fs.mkdirs(_module_js$path.dirname(dstFilename));

        var copyPromise;
        if (target.filterPrecompiledModuleCode) {
          copyPromise = _asyncToGenerator(function* () {
            var code = target.filterPrecompiledModuleCode(pkg, (yield _module_js$fs.readFile(_this.file, { encoding: "utf8" })));
            yield _module_js$fs.writeFile(dstFilename, code, { encoding: "utf8" });
          })();
        } else {
          copyPromise = _module_js$fs.copy(this.file, dstFilename);
        }

        var copyMap = _asyncToGenerator(function* () {
          if (yield _module_js$fs.stat(_this.file + ".map")) {
            yield _module_js$fs.copy(_this.file + ".map", dstFilename + ".map");
          }
        });

        yield _core.Promise.all([copyPromise, copyMap()]);
      })
    }
  }, {
    sourceFileForTarget: {
      value: function sourceFileForTarget(filenames, target) {
        if (target.mode === TARGET_MODE_DEV) {
          var _iteratorNormalCompletion = true;
          var _didIteratorError = false;
          var _iteratorError = undefined;

          try {
            for (var _iterator = _core.$for.getIterator(filenames), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
              var f = _step.value;

              if (f === "__precompiled.dev.js") {
                return f;
              }
            }
          } catch (err) {
            _didIteratorError = true;
            _iteratorError = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion && _iterator["return"]) {
                _iterator["return"]();
              }
            } finally {
              if (_didIteratorError) {
                throw _iteratorError;
              }
            }
          }
        } else {
          var _iteratorNormalCompletion2 = true;
          var _didIteratorError2 = false;
          var _iteratorError2 = undefined;

          try {
            for (var _iterator2 = _core.$for.getIterator(filenames), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
              var f = _step2.value;

              if (f === "__precompiled.release.js" || f === "__precompiled.js" || f === "__precompiled.min.js") {
                return f;
              }
            }
          } catch (err) {
            _didIteratorError2 = true;
            _iteratorError2 = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion2 && _iterator2["return"]) {
                _iterator2["return"]();
              }
            } finally {
              if (_didIteratorError2) {
                throw _iteratorError2;
              }
            }
          }
        }
        return filenames[0];
      }
    }
  });

  return PrecompiledModule;
})(Module);
"use strict";

var _JOPATH, _paths;

var Env = Object.create(null, {
  JOPATH: {
    enumerable: true,
    get: function () {
      return _JOPATH || (_JOPATH = process.env.JOPATH ? Env.parse(process.env.JOPATH) : []);
    },
    set: function (v) {
      _JOPATH = v;process.env.JOPATH = Env.format(v);_paths = null;_paths = null;
    } },

  JOROOT: {
    enumerable: true,
    value: process.env.JOROOT || (process.env.JOROOT = _env_js$path.dirname(_env_js$path.dirname(_env_js$path.dirname(__dirname))))
  },
  paths: {
    enumerable: true,
    get: function () {
      return _paths || (_paths = [Env.JOROOT].concat(Env.JOPATH));
    }
  },
  format: { value: function (v) {
      return v.join(":");
    } },
  parse: { value: function (s) {
      return s.split(":").map(function (v) {
        return v.trim();
      }).filter(function (v) {
        return v;
      });
    } },
  open: { value: function (filename, flags, mode) {
      return fsTryDirs1(filename, null, function (path, cb) {
        return _env_js$fs.openAsync(path, flags, mode, cb);
      });
    } },
  readdir: { value: function (dirname, basedirSuffix) {
      return fsTryDirs1(dirname, basedirSuffix, _env_js$fs.readdirAsync);
    } } });

function fsTryDirs1(filename, basedirSuffix, fn) {
  return new _core.Promise(function (resolve, reject) {
    var paths = Env.paths;
    var dirs = basedirSuffix ? paths.map(function (s) {
      return s + "/" + basedirSuffix;
    }).concat(Env.JOPATH) : paths;
    var next = (function (_next) {
      var _nextWrapper = function next(_x) {
        return _next.apply(this, arguments);
      };

      _nextWrapper.toString = function () {
        return _next.toString();
      };

      return _nextWrapper;
    })(function (index) {
      var basedir = dirs[index];
      var jopath = paths[index++];
      var pkgdir = basedir + "/" + filename;
      fn(pkgdir, function (err, ret) {
        if (err && err.code === "ENOENT") {
          if (index === dirs.length) {
            err = new Error(_env_js$repr(filename) + " not found in " + (dirs.length > 1 ? "any of " : "") + dirs.map(_env_js$repr).join(", "));
            err.code = "ENOENT";
            err.errno = 34;
            err.path = filename;
          } else {
            return next(index);
          }
        }
        if (err) {
          reject(err);
        } else {
          resolve([ret, pkgdir, jopath]);
        }
      });
    });
    next(0);
  });
}
"use strict";

var TARGET_BROWSER = "browser";
var TARGET_BROWSER_WEBKIT = "browser-webkit";
var TARGET_NODEJS = "nodejs";

var TARGET_MODE_DEV = "dev";
var TARGET_MODE_RELEASE = "release";

var Targets = {};

function _$record(name, prototype) {
  var toString = function toString() {
    return "<record " + this.__name + " " + JSON.stringify(this) + ">";
  };
  Object.defineProperties(prototype, {
    __name: { value: name },
    toString: { value: toString } });
  _core.Object.freeze(prototype);
  var record = function record(properties) {
    var k,
        v,
        props = {};
    for (k in properties) {
      v = props[k];
      if (v !== undefined) {
        props[k] = { value: v, enumerable: true, configurable: true };
      } else if (!(k in prototype)) {
        throw new Error("unexpected property " + JSON.stringify(k) + " assigned to record " + name);
      }
    }
    return Object.create(prototype, props);
  };
  record["default"] = prototype;
  return record;
}

var TargetOptions = _$record("TargetOptions", {
  logger: undefined,
  output: null,
  warningsAsErrors: false });

var GLOBAL_STD = 1;
var GLOBAL_DEPRECATED = 2;
var GLOBAL_UNSAFE = 4;
var GLOBAL_EXPERIMENTAL = 8;

var globalJSNames = {
  Infinity: GLOBAL_STD,
  NaN: GLOBAL_STD,
  "null": GLOBAL_STD,
  undefined: GLOBAL_STD,
  eval: GLOBAL_STD,
  uneval: GLOBAL_UNSAFE,
  isFinite: GLOBAL_STD,
  isNaN: GLOBAL_STD,
  parseFloat: GLOBAL_STD,
  parseInt: GLOBAL_STD,
  decodeURI: GLOBAL_STD,
  decodeURIComponent: GLOBAL_STD,
  encodeURI: GLOBAL_STD,
  encodeURIComponent: GLOBAL_STD,
  escape: GLOBAL_DEPRECATED,
  unescape: GLOBAL_DEPRECATED,
  Object: GLOBAL_STD,
  Function: GLOBAL_STD,
  Boolean: GLOBAL_STD,
  "Symbol ": GLOBAL_STD,
  Error: GLOBAL_STD,
  EvalError: GLOBAL_STD,
  InternalError: GLOBAL_STD,
  RangeError: GLOBAL_STD,
  ReferenceError: GLOBAL_STD,
  SyntaxError: GLOBAL_STD,
  TypeError: GLOBAL_STD,
  URIError: GLOBAL_STD,
  Number: GLOBAL_STD,
  Math: GLOBAL_STD,
  Date: GLOBAL_STD,
  String: GLOBAL_STD,
  RegExp: GLOBAL_STD,
  Array: GLOBAL_STD,
  Int8Array: GLOBAL_STD,
  Uint8Array: GLOBAL_STD,
  Uint8ClampedArray: GLOBAL_STD,
  Int16Array: GLOBAL_STD,
  Uint16Array: GLOBAL_STD,
  Int32Array: GLOBAL_STD,
  Uint32Array: GLOBAL_STD,
  Float32Array: GLOBAL_STD,
  Float64Array: GLOBAL_STD,
  Map: GLOBAL_STD,
  Set: GLOBAL_STD,
  WeakMap: GLOBAL_STD,
  WeakSet: GLOBAL_STD,
  SIMD: GLOBAL_EXPERIMENTAL,
  ArrayBuffer: GLOBAL_STD,
  DataView: GLOBAL_STD,
  JSON: GLOBAL_STD,
  Promise: GLOBAL_STD,
  Generator: GLOBAL_EXPERIMENTAL,
  GeneratorFunction: GLOBAL_EXPERIMENTAL,
  Reflect: GLOBAL_EXPERIMENTAL,
  Proxy: GLOBAL_EXPERIMENTAL,
  Intl: GLOBAL_EXPERIMENTAL,
  arguments: GLOBAL_STD };

var Target = (function () {
  function Target(id, mode, options) {
    _classCallCheck(this, Target);

    this.id = id;
    this.mode = mode;
    this.options = options;
    this.globals = { __proto__: globalJSNames };
    this.builtInModuleRefs = {};
    if (options.globals && options.globals instanceof Array) {
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = _core.$for.getIterator(options.globals), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var globalName = _step.value;

          this.globals[globalName] = 1;
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator["return"]) {
            _iterator["return"]();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }
    }
  }

  _createClass(Target, {
    registerGlobals: {
      value: function registerGlobals(globals) {
        globals.__proto__ = this.globals;
        this.globals = globals;
      }
    },
    registerBuiltInModules: {
      value: function registerBuiltInModules(refs) {
        var _this = this;

        refs.forEach(function (ref) {
          _this.builtInModuleRefs[ref] = true;
        });
      }
    },
    log: {
      get: function () {
        return this.options.logger;
      }
    },
    isDevMode: {
      get: function () {
        return this.mode === TARGET_MODE_DEV;
      }
    },
    targetForDependency: {
      get: function () {
        return this;
      }
    },
    moduleType: {
      get: function () {
        return "ignore";
      }
    },
    pkgDirName: {
      get: function () {
        return this.id + "." + this.mode;
      }
    },
    moduleForPackage: {
      value: function moduleForPackage(pkg, depLevel) {
        return new Module({ file: this.moduleFilename(pkg, depLevel) });
      }
    },
    moduleFilename: {
      value: function moduleFilename(pkg, depLevel) {
        if (pkg.jopath && pkg.ref) {
          return pkg.jopath + "/pkg/" + this.pkgDirName + "/" + pkg.ref + "/index.js";
        }
        return WorkDir.path + "/" + (pkg.ref ? "pkg/" + this.pkgDirName + "/" + pkg.ref : "pkgdir/" + this.pkgDirName + pkg.dir) + ".js";
      }
    },
    precompiledModuleFilename: {
      value: function precompiledModuleFilename(pkg, depLevel) {
        return this.moduleFilename(pkg, depLevel);
      }
    },
    transforms: {
      value: (function (_transforms) {
        var _transformsWrapper = function transforms(_x) {
          return _transforms.apply(this, arguments);
        };

        _transformsWrapper.toString = function () {
          return _transforms.toString();
        };

        return _transformsWrapper;
      })(function (transforms) {
        if (this.mode === TARGET_MODE_RELEASE) {
          transforms = transforms.concat(["utility.removeDebugger", "utility.deadCodeElimination"]);
        }

        return transforms;
      })
    },
    disabledTransforms: {
      value: (function (_disabledTransforms) {
        var _disabledTransformsWrapper = function disabledTransforms(_x2) {
          return _disabledTransforms.apply(this, arguments);
        };

        _disabledTransformsWrapper.toString = function () {
          return _disabledTransforms.toString();
        };

        return _disabledTransformsWrapper;
      })(function (disabledTransforms) {
        return disabledTransforms;
      })
    },
    resolveRequiredRuntimeModules: {
      value: function resolveRequiredRuntimeModules(pkg) {
        var runtimeModules = [];
        var visited = {};
        var visit = (function (_visit) {
          var _visitWrapper = function visit(_x) {
            return _visit.apply(this, arguments);
          };

          _visitWrapper.toString = function () {
            return _visit.toString();
          };

          return _visitWrapper;
        })(function (pkg) {
          if (pkg.dir in visited) return;
          visited[pkg.dir] = true;
          var runtimeMods = pkg.pkgInfo ? pkg.pkgInfo["babel-runtime"] : null;
          if (runtimeMods) {
            runtimeModules = runtimeModules.concat(runtimeMods);
          }
          var _iteratorNormalCompletion = true;
          var _didIteratorError = false;
          var _iteratorError = undefined;

          try {
            for (var _iterator = _core.$for.getIterator(pkg.deps), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
              var depPkg = _step.value;

              visit(depPkg);
            }
          } catch (err) {
            _didIteratorError = true;
            _iteratorError = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion && _iterator["return"]) {
                _iterator["return"]();
              }
            } finally {
              if (_didIteratorError) {
                throw _iteratorError;
              }
            }
          }
        });
        visit(pkg);
        return _target_js$Unique(runtimeModules);
      }
    },
    runtimeHelperSourceFilename: {
      value: function runtimeHelperSourceFilename(ref) {
        var basedir = Env.JOROOT + "/node_modules/babel-runtime/";
        if (ref === "regenerator") {
          return basedir + "regenerator/runtime.js";
        } else {
          return basedir + ref + ".js";
        }
      }
    }
  }, {
    create: {
      value: function create(id, mode) {
        var options = arguments[2] === undefined ? TargetOptions["default"] : arguments[2];

        switch (mode) {
          case undefined:case null:
            mode = TARGET_MODE_RELEASE;break;
          case TARGET_MODE_RELEASE:case TARGET_MODE_DEV:
            break;
          default:
            throw new Error("unknown target mode \"" + mode + "\"");
        }
        var TargetType = Targets[id.toLowerCase()];
        if (!TargetType) {
          throw new Error("unknown target identifier \"" + id + "\" (available targets: " + _core.Object.keys(Targets) + ")");
        }
        return new TargetType(id, mode, options);
      }
    }
  });

  return Target;
})();
"use strict";

var NodeJSTarget = (function (_Target) {
  function NodeJSTarget(id, mode, options) {
    _classCallCheck(this, NodeJSTarget);

    _get(_core.Object.getPrototypeOf(NodeJSTarget.prototype), "constructor", this).call(this, id, mode, options);
    this.registerGlobals({
      setImmediate: GLOBAL_STD,
      setInterval: GLOBAL_STD,
      setTimeout: GLOBAL_STD,
      clearImmediate: GLOBAL_STD,
      clearInterval: GLOBAL_STD,
      clearTimeout: GLOBAL_STD,
      Buffer: GLOBAL_STD,
      console: GLOBAL_STD,
      exports: GLOBAL_STD,
      global: GLOBAL_STD,
      module: GLOBAL_STD,
      process: GLOBAL_STD,
      require: GLOBAL_STD,
      __dirname: GLOBAL_STD,
      __filename: GLOBAL_STD });
    this.registerBuiltInModules(["assert", "buffer", "child_process", "cluster", "console", "constants", "crypto", "dgram", "dns", "domain", "events", "freelist", "fs", "http", "https", "module", "net", "os", "path", "punycode", "querystring", "readline", "repl", "smalloc", "stream", "string_decoder", "sys", "timers", "tls", "tty", "url", "util", "vm", "zlib"]);
  }

  _inherits(NodeJSTarget, _Target);

  _createClass(NodeJSTarget, {
    moduleType: {
      get: function () {
        return "common";
      }
    },
    preMake: {
      value: _asyncToGenerator(function* (pkgs) {
        if (!pkgs[0].jopath) {
          var pkgdir = _target_nodejs_js$path.resolve(pkgs[0].dir);
          this.localNodeModulesDir = pkgdir ? pkgdir + "/node_modules" : null;
        }
      })
    },
    moduleFilename: {
      value: function moduleFilename(pkg, depLevel) {
        if (!pkg.jopath) {
          if (depLevel === 0) {
            return null;
          }
          if (this.localNodeModulesDir) {
            return this.localNodeModulesDir + "/" + (pkg.ref ? pkg.ref : _target_nodejs_js$path.resolve(pkg.dir).pop()) + ".js";
          }
        }
        return _get(_core.Object.getPrototypeOf(NodeJSTarget.prototype), "moduleFilename", this).call(this, pkg, depLevel);
      }
    },
    transforms: {
      value: (function (_transforms) {
        var _transformsWrapper = function transforms(_x) {
          return _transforms.apply(this, arguments);
        };

        _transformsWrapper.toString = function () {
          return _transforms.toString();
        };

        return _transformsWrapper;
      })(function (transforms) {
        return _get(_core.Object.getPrototypeOf(NodeJSTarget.prototype), "transforms", this).call(this, transforms).concat(["asyncToGenerator"]);
      })
    },
    programDstFile: {
      value: function programDstFile(pkg) {
        if (this._programDstFile === undefined || this._programDstFile.pkg !== pkg) {
          var s;
          if (this.options.output) {
            s = this.options.output;
          } else if (pkg.jopath) {
            var progname = pkg.ref.split("/").pop();
            s = pkg.jopath + "/bin/" + progname + (this.isDevMode ? "-g" : "");
          } else {
            if (pkg.ref) {
              s = "./" + pkg.ref;
            } else {
              s = "./" + _target_nodejs_js$path.resolve(pkg.dir).split("/").pop();
            }
          }
          this._programDstFile = { pkg: pkg, v: s };
        }
        return this._programDstFile.v;
      }
    },
    pkgModuleHeader: {
      value: function pkgModuleHeader(pkg, depLevel) {
        if (depLevel === 0 && pkg.hasMainFunc) {
          return this.programBootCode(pkg);
        }
      }
    },
    genJOROOTInitCode: {
      value: function genJOROOTInitCode(pkg) {
        var bakedJOROOT = undefined;
        var dstDirAbs = _target_nodejs_js$path.dirname(_target_nodejs_js$path.resolve(this.programDstFile(pkg)));
        var isSelfJOProgram = false;
        if (dstDirAbs.indexOf(Env.JOROOT) === 0) {
          isSelfJOProgram = pkg.ref === "jo/jo";
          bakedJOROOT = "__dirname+" + JSON.stringify(_target_nodejs_js$path.relative(dstDirAbs, Env.JOROOT)).replace(/^"/, "\"/");
        } else {
          bakedJOROOT = JSON.stringify(Env.JOROOT);
        }
        return ((isSelfJOProgram ? "" : "process.env.JOROOT||") + "require(\"path\")." + (bakedJOROOT === "__dirname+\"/..\"" ? "dirname(__dirname)" : "resolve(" + bakedJOROOT + ")")
        );
      }
    },
    programBootCode: {
      value: function programBootCode(pkg) {
        var _this = this;

        if (this._programBootCode && this._programBootCode.pkg === pkg) {
          return this._programBootCode.v;
        }

        var nodeArgs = " --harmony";
        if (this.isDevMode) {
          nodeArgs += " --stack-trace-limit=25";
        }
        var shebang = "#!/usr/bin/env node" + nodeArgs + "\n";

        var rootInit = this.genJOROOTInitCode(pkg);

        var codeVars = ("\nvar __$r=function(){__$r=" + rootInit + ";}\n,__$lrt=function(ref){\n  if(typeof __$r!==\"string\"){__$r();}\n  return require(__$r+\"/node_modules/\"+ref);\n}\n,__$i=global.__$i=function(m){return m && m.__esModule ? (m[\"default\"] || m) : m; }\n,__$iw=global.__$iw=function(m){return m && m.__esModule ? m : {\"default\":m}; }\n    ").trim() + "\n";

        var codeRest = "\nglobal.__$irt=function(r){return __$i(__$lrt(r));};\n__$irt(\"source-map-support\").install();\n    ".trim() + "\n";

        var hasPkgImports = pkg.pkgInfo.imports && pkg.pkgInfo.imports.some(function (ref) {
          return ref[0] !== "." && ref[0] !== "/" && !_this.builtInModuleRefs[ref];
        });
        if (hasPkgImports) {
          codeVars += ("\n,__$p\n,__$fex=require(\"fs\").existsSync\n,__$lpkg=function(q,ref){\n  var i,d,v;\n  if(!__$p){\n    if(typeof __$r!==\"string\"){__$r();}\n    d=" + JSON.stringify("/pkg/" + this.pkgDirName + "/") + ";\n    __$p=[__$r+d];\n    if(v=process.env.JOPATH){\n      v=v.split(\":\");\n      for(i in v){\n        if(v[i])__$p.push(v[i]+d);\n      }\n    }\n  }\n  for(i in __$p){\n    d=__$p[i]+ref+\"/index.js\";\n    if(__$fex(d)){\n      return q(d);\n    }\n  }\n  return q(ref);\n}\n      ").trim() + "\n";
          codeRest += "\nglobal.__$im=function(q,r){return __$i(__$lpkg(q,r));};\nglobal.__$imw=function(q,r){return __$iw(__$lpkg(q,r));};\n      ".trim() + "\n";
        }

        var code = codeVars.trim() + ";\n" + codeRest.trim();
        code = shebang + (this.isDevMode ? code.trim() : code.replace(/[ \t]*\r?\n[ \t]*/mg, ""));

        this._programBootCode = { pkg: pkg, v: code };
        return code;
      }
    },
    postMake: {
      value: _asyncToGenerator(function* (pkgs) {
        var pkg = pkgs[0];

        if (pkg.jopath && !pkg.hasMainFunc) {
          return;
        }

        var fileMode = 511;
        if (!pkg.hasMainFunc) {
          fileMode = 438;
        }

        var programDstFile = this.programDstFile(pkg);
        var writeToStdout = this.options.output && programDstFile === "-";

        var code = pkg.module.code;
        var p = code.lastIndexOf("\n//#sourceMappingURL=");
        var mainCall = "main(process.argv);\n";
        if (p === -1) {
          code += mainCall;
        } else {
          code = code.substr(0, p + 1) + mainCall + code.substr(p + 1);
        }

        pkg.module.map.inline = true;

        yield writeCode(code, pkg.module.map, programDstFile, writeToStdout);
        if (!writeToStdout) {
          yield _target_nodejs_js$fs.chmod(programDstFile, fileMode);
        }
      })
    }
  });

  return NodeJSTarget;
})(Target);

function _target_nodejs_js$init() {
  Targets[TARGET_NODEJS] = NodeJSTarget;
}
"use strict";

var BrowserTarget = (function (_Target) {
  function BrowserTarget(id, mode, options) {
    _classCallCheck(this, BrowserTarget);

    _get(_core.Object.getPrototypeOf(BrowserTarget.prototype), "constructor", this).call(this, id, mode, options);
    this.registerGlobals({
      window: GLOBAL_STD,
      WSH: GLOBAL_STD,
      Image: GLOBAL_STD,
      XMLHttpRequest: GLOBAL_STD,
      Notification: GLOBAL_STD,
      Storage: GLOBAL_STD,
      Option: GLOBAL_STD,
      FormData: GLOBAL_STD,
      require: GLOBAL_STD,
      exports: GLOBAL_STD,
      alert: GLOBAL_STD,
      confirm: GLOBAL_STD,
      console: GLOBAL_STD,
      Debug: GLOBAL_STD,
      opera: GLOBAL_STD,
      prompt: GLOBAL_STD,
      setInterval: GLOBAL_STD,
      setTimeout: GLOBAL_STD,
      clearInterval: GLOBAL_STD,
      clearTimeout: GLOBAL_STD,
      document: GLOBAL_STD,
      event: GLOBAL_STD,
      frames: GLOBAL_STD,
      history: GLOBAL_STD,
      localStorage: GLOBAL_STD,
      location: GLOBAL_STD,
      name: GLOBAL_STD,
      navigator: GLOBAL_STD,
      parent: GLOBAL_STD,
      screen: GLOBAL_STD,
      sessionStorage: GLOBAL_STD });

    this.modules = [];
  }

  _inherits(BrowserTarget, _Target);

  _createClass(BrowserTarget, {
    transforms: {
      value: (function (_transforms) {
        var _transformsWrapper = function transforms(_x) {
          return _transforms.apply(this, arguments);
        };

        _transformsWrapper.toString = function () {
          return _transforms.toString();
        };

        return _transformsWrapper;
      })(function (transforms) {
        return _get(_core.Object.getPrototypeOf(BrowserTarget.prototype), "transforms", this).call(this, transforms).concat(["regenerator"]);
      })
    },
    moduleType: {
      get: function () {
        return "common";
      }
    },
    moduleFilename: {
      value: function moduleFilename(pkg, depLevel) {
        var filename;
        if (pkg.ref) {
          filename = pkg.ref.replace(/\//g, ".");
        } else {
          _target_browser_js$path.basename(pkg.dir);
        }
        filename = ".jopkg." + filename + ".js";
        this.modules.push({ filename: filename, pkg: pkg });
        return this.outputDir + "/" + filename;
      }
    },
    loadHTMLTemplate: {
      value: _asyncToGenerator(function* (pkg) {
        var filename = pkg.dir + "/index.template.html";
        try {
          return {
            code: yield _target_browser_js$fs.readFile(filename, { encoding: "utf8" }),
            filename: filename };
        } catch (e) {
          return null;
        }
      })
    },
    preMake: {
      value: _asyncToGenerator(function* (pkgs) {
        if (pkgs.length !== 1) {
          throw new Error("-target=browser only supports a single top-level package");
        }
        this.outputDir = pkgs[0].dir;
      })
    },
    postMake: {
      value: _asyncToGenerator(function* (pkgs) {
        var pkg = pkgs[0];

        if (!pkg.hasMainFunc) {
          throw "No main() function found in package " + pkg.id;
        }

        var htmlTemplate = yield this.loadHTMLTemplate(pkg);
        if (!htmlTemplate) {
          throw new Error("unable to find HTML template index.template.html in \"" + pkg.dir + "\"");
        }

        var insertOffs = htmlTemplate.code.indexOf("</head>");
        if (insertOffs === -1) {
          if ((insertOffs = htmlTemplate.code.indexOf("<body>")) !== -1) {
            insertOffs += "<body>".length;
          } else {
            throw new Error("can't find </head> or <body> in HTML template");
          }
        }

        var additionalModuleURLs = [];

        var runtimeModules = this.resolveRequiredRuntimeModules(pkg);
        if (runtimeModules.length !== 0) {
          var runtimeFilename = ".jopkg.babel-runtime.js";
          var version = yield this.genRuntime(runtimeModules, pkg.dir + "/" + runtimeFilename);
          additionalModuleURLs.push(runtimeFilename + "?" + version);
        }

        var bootCode = this.genBootCode(pkg, additionalModuleURLs);
        var code = "<!--" + JSON.stringify(this.genPkgInfo(pkg)) + "-->\n" + htmlTemplate.code.substr(0, insertOffs) + bootCode + htmlTemplate.code.substr(insertOffs);

        var productFilename = pkg.dir + "/index.html";
        yield _target_browser_js$fs.writeFile(productFilename, code, { encoding: "utf8" });
      })
    },
    genPkgInfo: {
      value: function genPkgInfo(mainPkg) {
        var files = [];
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = _core.$for.getIterator(this.modules), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var m = _step.value;

            if (m.pkg.module instanceof PrecompiledModule) {
              files.push(_target_browser_js$path.relative(mainPkg.dir, m.pkg.module.file));
            } else {
              var _iteratorNormalCompletion2 = true;
              var _didIteratorError2 = false;
              var _iteratorError2 = undefined;

              try {
                for (var _iterator2 = _core.$for.getIterator(m.pkg.pkgInfo.files), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                  var file = _step2.value;

                  files.push(_target_browser_js$path.relative(mainPkg.dir, m.pkg.dir + "/" + file));
                }
              } catch (err) {
                _didIteratorError2 = true;
                _iteratorError2 = err;
              } finally {
                try {
                  if (!_iteratorNormalCompletion2 && _iterator2["return"]) {
                    _iterator2["return"]();
                  }
                } finally {
                  if (_didIteratorError2) {
                    throw _iteratorError2;
                  }
                }
              }
            }
          }
        } catch (err) {
          _didIteratorError = true;
          _iteratorError = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion && _iterator["return"]) {
              _iterator["return"]();
            }
          } finally {
            if (_didIteratorError) {
              throw _iteratorError;
            }
          }
        }

        return { files: files };
      }
    },
    genRuntime: {
      value: _asyncToGenerator(function* (refs, outFilename) {
        var _this = this;

        var code = "";

        refs = refs.slice();
        refs.sort(function (a, b) {
          return a === "core-js" ? -1 : b === "core-js" ? 1 : 0;
        });
        var filenames = refs.map(function (ref) {
          return _this.runtimeHelperSourceFilename(ref);
        });

        var outs = _target_browser_js$fs.createWriteStream(outFilename, { encoding: "utf8" });
        var mtimes = yield _core.Promise.all(filenames.map(function (srcFilename, i) {
          return _this._writeRuntimeModule(refs[i], outs, srcFilename);
        }));
        yield new _core.Promise(function (resolve, reject) {
          outs.end(function (err) {
            if (err) reject(err);else resolve();
          });
        });

        return mtimes.reduce(function (m, v) {
          return Math.max(m, v);
        }, 0).toString(36);
      })
    },
    _writeRuntimeModule: {
      value: _asyncToGenerator(function* (ref, outs, srcFilename) {
        var st = yield _target_browser_js$fs.stat(srcFilename);
        var code = yield _target_browser_js$fs.readFile(srcFilename, { encoding: "utf8" });
        outs.write(this._moduleHeader("babel-runtime/" + ref, false));
        outs.write(code);
        outs.write(this._moduleFooter(false));
        return st.mtime.getTime();
      })
    },
    filterPrecompiledModuleCode: {
      value: function filterPrecompiledModuleCode(pkg, code) {
        return this.pkgModuleHeader(pkg) + code + this.pkgModuleFooter(pkg);
      }
    },
    pkgModuleHeader: {
      value: function pkgModuleHeader(pkg, depLevel) {
        return this._moduleHeader(pkg.ref, pkg.hasMainFunc);
      }
    },
    pkgModuleFooter: {
      value: function pkgModuleFooter(pkg, depLevel) {
        return this._moduleFooter(pkg.hasMainFunc);
      }
    },
    _moduleHeader: {
      value: function _moduleHeader(ref, isMain) {
        var code;
        if (!ref || isMain) {
          code = "_$jomain";
        } else {
          code = "_$jomodules[" + JSON.stringify(ref) + "]";
        }
        return code + " = function(module,exports,require){";
      }
    },
    _moduleFooter: {
      value: function _moduleFooter(isMain) {
        return isMain ? "main();};" : "};";
      }
    },
    genBootCode: {
      value: function genBootCode(pkg, additionalModuleURLs) {
        var t = Date.now().toString(36);
        var code = "<script type=\"text/javascript\">\n    _$jomodules = {};\n    (function(){\n      var waitcount = " + (this.modules.length + additionalModuleURLs.length) + ";\n      var onload = function() {\n        var ref, onmessage, joboot;\n        if (--waitcount === 0) {\n          joboot = function() {\n            var modules = {}, require = function(ref) {\n              var m = modules[ref];\n              if (!m) {\n                modules[ref] = m = {exports:{}};\n                var f = _$jomodules[ref];\n                if (!f) {\n                  throw new Error('module not found \"'+ref+'\"');\n                }\n                f(m, m.exports, require);\n              }\n              return m.exports;\n            };\n            _$jomain({}, {}, require);\n            _$jomodules = null;\n          };\n          if (window.postMessage !== undefined) {\n            onmessage = function (ev) {\n              if ((ev.source === window || ev.source === null) && ev.data === 'joboot') {\n                ev.stopPropagation();\n                window.removeEventListener('message', onmessage, true);\n                joboot();\n              }\n            };\n            window.addEventListener('message', onmessage, true);\n            window.postMessage('joboot', '*');\n          } else {\n            setTimeout(joboot, 0);\n          }\n        }\n      };\n      var h = document.head || document.body || document.documentElement;\n      var lm = function(url) {\n        var s = document.createElement('script');\n        s.defer  = true;\n        s.async  = true;\n        s.onload = onload;\n        s.type   = 'text/javascript';\n        s.src    = url;\n        h.appendChild(s);\n      };";

        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = _core.$for.getIterator(this.modules), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var m = _step.value;

            var version = "";
            if (m.pkg.module.stat) {
              version = "?" + m.pkg.module.stat.mtime.getTime().toString(36);
            } else if (m.pkg.pkgInfo && m.pkg.pkgInfo.version) {
              version = "?" + m.pkg.pkgInfo.version;
            }
            code += "\n      lm(" + JSON.stringify(m.filename + version) + ");";
          }
        } catch (err) {
          _didIteratorError = true;
          _iteratorError = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion && _iterator["return"]) {
              _iterator["return"]();
            }
          } finally {
            if (_didIteratorError) {
              throw _iteratorError;
            }
          }
        }

        var _iteratorNormalCompletion2 = true;
        var _didIteratorError2 = false;
        var _iteratorError2 = undefined;

        try {
          for (var _iterator2 = _core.$for.getIterator(additionalModuleURLs), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
            var url = _step2.value;

            code += "\n      lm(" + JSON.stringify(url) + ");";
          }
        } catch (err) {
          _didIteratorError2 = true;
          _iteratorError2 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion2 && _iterator2["return"]) {
              _iterator2["return"]();
            }
          } finally {
            if (_didIteratorError2) {
              throw _iteratorError2;
            }
          }
        }

        code += "\n    })();\n</script>";

        return code;
      }
    }
  });

  return BrowserTarget;
})(Target);

function _target_browser_js$init() {
  Targets[TARGET_BROWSER] = BrowserTarget;
}
"use strict";

function Tokenizer(code) {
  var offs = 0;
  var line = 1;
  var lineStartOffs = 0;

  var c;
  var stack = [];

  var prevToken = null;
  var token = null;
  var startToken = function startToken(type, offset) {
    offset = offs + (offset || 0);
    return token = {
      type: type,
      loc: { start: { line: line, column: offset - lineStartOffs } },
      range: [offset, -1] };
  };
  var endToken = function endToken(value, offset) {
    offset = offs + (offset || 0);
    token.value = value === undefined ? null : value;
    token.loc.end = { line: line, column: offset - lineStartOffs };
    token.range[1] = offset;

    var tok = token;
    token = null;
    if (prevToken) {
      prevToken.next = tok;
    }
    tok.prev = prevToken;
    prevToken = tok;
    return tok;
  };

  var countLine = function countLine() {
    ++line;
    lineStartOffs = offs;
  };

  var readStringLiteral = function readStringLiteral(type) {
    startToken(type);
    var inEscape = false,
        value = "";
    while (offs < code.length) {
      switch (c = code[++offs]) {
        case "\\":
          {
            if (inEscape) {
              value += c;
              inEscape = false;
            } else {
              inEscape = true;
            }
            break;
          }
        case type:
          {
            if (inEscape) {
              value += c;
              inEscape = false;
            } else {
              return endToken(value, 1);
            }
          }
        case "\n":
          {
            throw new Error("linebreak inside string literal");
          }
        default:
          {
            if (inEscape) {
              inEscape = false;
            }
            value += c;
          }
      }
    }
    throw new Error("unterminated string literal");
  };

  var readMagicStringLiteral = function* readMagicStringLiteral() {
    stack.push("`");
    startToken("mstring");
    loop: while (offs < code.length) {
      switch (c = code[++offs]) {
        case "{":
          {
            if (code[offs - 1] === "$") {
              if (token.type === "mstring") {
                token.type = "mstring-start";
              }
              yield endToken(null, -1);
              startToken("mstring-codeblock-start", -1);
              yield endToken(null, 1);
              ++offs;
              var t = undefined,
                  g = readProgram();
              while (!(t = g.next()).done) {
                yield t.value;
              }
              startToken("mstring-codeblock-end");
              yield endToken(null, 1);
              startToken("mstring-cont", 1);
            }
            break;
          }
        case "`":
          {
            var sc = stack.pop();
            if (sc !== "`") {
              throw new Error("unexpected " + c + " in multi-line string literal");
            }
            if (token.type === "mstring-cont") {
              token.type = "mstring-end";
            }
            yield endToken(null, 1);
            return;
          }
      }
    }
    throw new Error("unterminated string literal");
  };

  var readWhitespace = function readWhitespace() {
    startToken("whitespace");
    loop: while (offs < code.length) {
      switch (c = code[++offs]) {
        case " ":case "\t":case "\r":
          {
            break;
          }
        default:
          {
            break loop;
          }
      }
    }
    --offs;
    return endToken(null, 1);
  };

  var readLineComment = function readLineComment() {
    startToken("comment-line");
    while (offs < code.length) {
      if (code[++offs] === "\n") {
        --offs;
        return endToken(null, 1);
      }
    }
    return endToken();
  };

  var readBlockComment = function readBlockComment() {
    startToken("comment-block");
    while (offs < code.length) {
      switch (code[++offs]) {
        case "/":
          {
            if (code[offs - 1] === "*") {
              return endToken(null, +1);
            }
            break;
          }
        case "\n":
          {
            countLine();
            break;
          }
      }
    }
    throw new Error("unterminated block comment");
  };

  var readFrontSlash = function readFrontSlash() {
    var c = code[offs + 1];
    if (c === "/") {
      return readLineComment();
    } else if (c === "*") {
      return readBlockComment();
    }
    startToken("/");
    return endToken();
  };

  var readSomething = function readSomething() {
    startToken(c);
    loop: while (offs < code.length) {
      switch (c = code[++offs]) {
        case " ":case "\t":case "\r":case "\n":
        case ";":case ".":case ":":case "'":case "\"":case "`":
        case "{":case "}":case "[":case "]":
        case "(":case ")":
        case "/":case "*":case "-":case "+":case "&":case "^":
        case "#":case "%":case "!":case "?":case "<":case ">":
        case "=":
          {
            break loop;
          }
        default:
          {
            token.type += c;
          }
      }
    }
    --offs;
    return endToken(null, 1);
  };

  var popStack = function popStack(c, expectC) {
    if (stack.length === 0) {
      throw new Error("unexpected " + c);
    }
    if (stack[stack.length - 1] === expectC) {
      stack.pop();
      startToken(c);
      return endToken(null, 1);
    }
    return null;
  };

  var readProgram = function* readProgram() {
    loop: while (offs < code.length) {
      switch (c = code[offs]) {

        case " ":case "\t":case "\r":
          {
            yield readWhitespace();
            break;
          }

        case "/":
          {
            yield readFrontSlash();
            break;
          }

        case "\n":
          {
            countLine();
            startToken("line");
            yield endToken(null, 1);
            break;
          }

        case "\"":case "'":
          {
            yield readStringLiteral(c);
            break;
          }

        case "`":
          {
            var t = undefined,
                g = readMagicStringLiteral();
            while (!(t = g.next()).done) {
              yield t.value;
            }
            break;
          }

        case "{":case "[":case "(":
          {
            stack.push(c);
            startToken(c);
            yield endToken(null, 1);
            break;
          }

        case "}":
          {
            var t = popStack(c, "{");
            if (!t) {
              break loop;
            }
            yield t;
            break;
          }
        case "]":
          {
            var t = popStack(c, "[");
            if (!t) {
              break loop;
            }
            yield t;
            break;
          }
        case ")":
          {
            var t = popStack(c, "(");
            if (!t) {
              break loop;
            }
            yield t;
            break;
          }

        case ";":case ".":case ":":
        case "*":case "^":
        case "#":case "%":case "!":case "?":
        case "-":case "+":
        case "&":case "<":case ">":case "=":
          {
            startToken(c);
            yield endToken(null, 1);
            break;
          }

        default:
          {
            yield readSomething();
            break;
          }
      }
      ++offs;
    }

    if (token) {
      yield endToken();
    }
  };

  return readProgram();
}
"use strict";

var SrcFile = (function () {
  function SrcFile() {
    _classCallCheck(this, SrcFile);
  }

  _createClass(SrcFile, null, {
    filenameMatches: {
      value: function filenameMatches(filename) {
        return filename.match(/^[^\.].*\.js$/);
      }
    }
  });

  return SrcFile;
})();
"use strict";

var npmRefPrefix = "npmjs.com/";

var Pkg = (function () {
  function Pkg(_ref) {
    var dir = _ref.dir;
    var ref = _ref.ref;
    var jopath = _ref.jopath;
    var files = _ref.files;

    _classCallCheck(this, Pkg);

    this.dir = dir;
    this.ref = ref;
    this.jopath = jopath;
    this.files = files;
    this.imports = {};
    this.exports = {};
    this.module = null;
    this.deps = [];
    this.pkgInfo = null;
  }

  _createClass(Pkg, {
    id: {
      get: function () {
        return this.ref || this.dir;
      }
    },
    hasMainFunc: {
      get: function () {
        return !!this.mainFunc || this.pkgInfo && this.pkgInfo.main;
      }
    },
    resolveOutputFile: {
      value: _asyncToGenerator(function* (output) {
        var st = yield _pkg_js$fs.stat(output);
        if (st && st.isDirectory()) {
          return _pkg_js$path.basename(this.id) + ".js";
        }
        return output;
      })
    },
    loadSrcFiles: {
      value: function loadSrcFiles() {
        var _this = this;

        return _core.Promise.all(this.files.map(_asyncToGenerator(function* (fn) {
          var filename = _this.dir + "/" + fn;
          var st = yield _pkg_js$fs.stat(filename);
          var type = _pkg_js$path.extname(fn).substr(1).toLowerCase();
          return ({
              dir: _this.dir,
              name: fn,
              relpath: fn,
              st: st,
              type: type,
              pkg: _this }
          );
        })));
      }
    },
    pkgFromRef: {
      value: _asyncToGenerator(function* (ref) {
        var importedAt = arguments[1] === undefined ? null : arguments[1];
        var target = arguments[2] === undefined ? null : arguments[2];

        var parentPkg = this;
        var pkgdir;

        if (ref[0] === ".") {
          pkgdir = _pkg_js$path.normalize(parentPkg.dir + "/" + ref);

          if (parentPkg.ref) {
            ref = _pkg_js$path.normalize(parentPkg.ref + "/" + ref);
            if (ref[0] === ".") {
              throw _pkg_js$SrcError("ImportError", importedAt, "recursive dependency; trying to import parent package from child package");
            }
          }
        }

        var pkg = undefined,
            importError = undefined,
            files = [];

        if (ref[0] === ".") {
          try {
            files = (yield _pkg_js$fs.readdir(pkgdir)).filter(SrcFile.filenameMatches);
            pkg = new Pkg({ ref: ref, dir: pkgdir, files: files, jopath: parentPkg.jopath });
          } catch (e) {
            if (e.name === "TypeError") {
              throw e;
            }
            importError = e;
          }
        } else if (NPMPkg.refIsNPM(ref)) {
          return new NPMPkg(NPMPkg.stripNPMRefPrefix(ref));
        } else {
          if (target && target.builtInModuleRefs[ref]) {
            return new BuiltInPkg(ref);
          }
          try {
            var _ref = yield Pkg._envReadRefSrcDir(ref);

            var _ref2 = _slicedToArray(_ref, 3);

            var _files = _ref2[0];
            var _pkgdir = _ref2[1];
            var jopath = _ref2[2];

            files = _files.filter(SrcFile.filenameMatches);
            pkg = new Pkg({ ref: ref, dir: _pkgdir, files: files, jopath: parentPkg.jopath });
          } catch (e) {
            if (e.name === "TypeError") {
              throw e;
            }
            importError = e;
          }
        }

        if (!importError && files.length === 0) {
          throw _pkg_js$SrcError("PkgError", null, "no source files found in package \"" + pkg.id + "\"", null, [{ message: "imported here", srcloc: importedAt }]);
        } else if (importError) {
          throw _pkg_js$SrcError("ImportError", importedAt, importError.message);
        }

        return pkg;
      })
    }
  }, {
    parsePkgInfo: {
      value: function parsePkgInfo(code) {
        var jopkgStmtPrefix = "//#jopkg";
        var end,
            begin = code.indexOf(jopkgStmtPrefix);
        if (begin !== -1) {
          begin += jopkgStmtPrefix.length;
          end = code.indexOf("\n", begin);
        }
        if (begin === -1 || end === -1) {
          throw new Error("missing jopkg statement");
        }
        return JSON.parse(code.substring(begin, end));
      }
    },
    _envReadRefSrcDir: {
      value: _asyncToGenerator(function* (ref) {
        return yield Env.readdir(ref, "src");
      })
    },
    fromRef: {
      value: _asyncToGenerator(function* (ref) {
        var files = undefined,
            pkg = undefined;
        if (ref[0] === "." || ref[0] === "/") {
          files = (yield _pkg_js$fs.readdir(ref)).filter(SrcFile.filenameMatches);
          pkg = new Pkg({ ref: null, dir: ref, files: files, jopath: null });
        } else {
          var _ref = yield Pkg._envReadRefSrcDir(ref);

          var _ref2 = _slicedToArray(_ref, 3);

          var _files = _ref2[0];
          var pkgdir = _ref2[1];
          var jopath = _ref2[2];

          files = _files.filter(SrcFile.filenameMatches);
          pkg = new Pkg({ ref: ref, dir: pkgdir, files: files, jopath: jopath });
        }
        if (files.length === 0) {
          throw "no source files found in package \"" + pkg.id + "\"";
        }
        return pkg;
      })
    },
    fromFiles: {
      value: _asyncToGenerator(function* (files) {
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = _core.$for.getIterator(files), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var f = _step.value;

            if (!SrcFile.filenameMatches(f)) {
              throw new Error("unexpected file type \"" + f + "\"");
            }
          }
        } catch (err) {
          _didIteratorError = true;
          _iteratorError = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion && _iterator["return"]) {
              _iterator["return"]();
            }
          } finally {
            if (_didIteratorError) {
              throw _iteratorError;
            }
          }
        }

        var pkgdir = _pkg_js$path.dirname(files[0]);
        return new Pkg({ ref: null, dir: pkgdir, files: files, jopath: null });
      })
    }
  });

  return Pkg;
})();

var BuiltInPkg = (function (_Pkg) {
  function BuiltInPkg(ref) {
    _classCallCheck(this, BuiltInPkg);

    _get(_core.Object.getPrototypeOf(BuiltInPkg.prototype), "constructor", this).call(this, { ref: ref });
  }

  _inherits(BuiltInPkg, _Pkg);

  return BuiltInPkg;
})(Pkg);

BuiltInPkg.prototype.isBuiltIn = true;

var NPMPkg = (function (_Pkg2) {
  function NPMPkg(ref) {
    _classCallCheck(this, NPMPkg);

    _get(_core.Object.getPrototypeOf(NPMPkg.prototype), "constructor", this).call(this, { ref: ref });
  }

  _inherits(NPMPkg, _Pkg2);

  return NPMPkg;
})(Pkg);

NPMPkg.prototype.isNPM = true;
NPMPkg.refIsNPM = function (ref) {
  return ref.length > npmRefPrefix.length && ref.substr(0, npmRefPrefix.length) === npmRefPrefix;
};
NPMPkg.stripNPMRefPrefix = function (ref) {
  return ref.substr(npmRefPrefix.length);
};
"use strict";

var Logger = (function () {
  function Logger(level) {
    var _this = this;

    _classCallCheck(this, Logger);

    this.level = level;
    var So = this.style = _logger_js$TermStyle.stdout;
    var Se = this.errstyle = _logger_js$TermStyle.stderr;
    var werr = function werr(style, args) {
      process.stderr.write(style.open);
      console.error.apply(console, args);
      process.stderr.write(style.close);
    };
    if (level >= Logger.DEBUG) {
      this.debug = function () {
        for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
          args[_key] = arguments[_key];
        }

        console.log.apply(console, args);
      };
    }
    if (level >= Logger.INFO) {
      this.info = function () {
        for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
          args[_key] = arguments[_key];
        }

        console.log.apply(console, args);
      };
    }
    if (level >= Logger.WARN) {
      this.warn = function () {
        for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
          args[_key] = arguments[_key];
        }

        console.log.apply(console, args);
      };
    }
    if (level >= Logger.ERROR) {
      this.error = function () {
        for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
          args[_key] = arguments[_key];
        }

        werr(So.boldRed, args);
      };
    }
    this.verbosityMap = (function () {
      var _verbosityMap = {};

      _defineProperty(_verbosityMap, _this.DEBUG, _this.debug.bind(_this));

      _defineProperty(_verbosityMap, _this.INFO, _this.info.bind(_this));

      _defineProperty(_verbosityMap, _this.WARN, _this.warn.bind(_this));

      _defineProperty(_verbosityMap, _this.ERROR, _this.error.bind(_this));

      return _verbosityMap;
    })();
  }

  _createClass(Logger, {
    debug: {
      value: function debug() {
        for (var _len = arguments.length, _ = Array(_len), _key = 0; _key < _len; _key++) {
          _[_key] = arguments[_key];
        }
      }
    },
    info: {
      value: function info() {
        for (var _len = arguments.length, _ = Array(_len), _key = 0; _key < _len; _key++) {
          _[_key] = arguments[_key];
        }
      }
    },
    warn: {
      value: function warn() {
        for (var _len = arguments.length, _ = Array(_len), _key = 0; _key < _len; _key++) {
          _[_key] = arguments[_key];
        }
      }
    },
    error: {
      value: function error() {
        for (var _len = arguments.length, _ = Array(_len), _key = 0; _key < _len; _key++) {
          _[_key] = arguments[_key];
        }
      }
    },
    log: {
      value: function log(verbosity) {
        var _verbosityMap;

        for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
          args[_key - 1] = arguments[_key];
        }

        (_verbosityMap = this.verbosityMap)[verbosity].apply(_verbosityMap, args);
      }
    }
  });

  return Logger;
})();

Logger.DEBUG = 3;
Logger.INFO = 2;
Logger.WARN = 1;
Logger.ERROR = 0;
"use strict";

function toposort(edges) {
  return _toposort(uniqueNodes(edges), edges);
}

function _toposort(nodes, edges) {
  var cursor = nodes.length,
      sorted = new Array(cursor),
      visited = {},
      i = cursor;

  while (i--) {
    if (!visited[i]) {
      visit(nodes[i], i, []);
    }
  }

  return sorted;

  function visit(node, i, predecessors) {
    if (predecessors.indexOf(node) >= 0) {
      return;
    }

    if (visited[i]) {
      return;
    }visited[i] = true;

    var outgoing = edges.filter(function (edge) {
      return edge[0] === node;
    });
    if (i = outgoing.length) {
      var preds = predecessors.concat(node);
      do {
        var child = outgoing[--i][1];
        visit(child, nodes.indexOf(child), preds);
      } while (i);
    }

    sorted[--cursor] = node;
  }
}

function uniqueNodes(arr) {
  var res = [];
  for (var i = 0, len = arr.length; i < len; i++) {
    var edge = arr[i];
    if (res.indexOf(edge[0]) < 0) res.push(edge[0]);
    if (res.indexOf(edge[1]) < 0) res.push(edge[1]);
  }
  return res;
}
"use strict";

var TokenEditor = (function () {
  function TokenEditor(tokenizer, srcfile, visitor) {
    _classCallCheck(this, TokenEditor);

    this.tokenizer = tokenizer;
    this.srcfile = srcfile;
    this.visitor = visitor;
  }

  _createClass(TokenEditor, {
    nextToken: {
      value: function nextToken() {
        var t = this.tokenizer.next();
        return t.done ? null : t.value;
      }
    },
    edit: {
      value: function edit() {
        var tok,
            tokens,
            dstCode = "";

        while (tok = this.nextToken()) {
          tokens = this.visitor(tok, this);
          if (tokens) {}

          var chunk = this.srcfile.code.substring(tok.range[0], tok.range[1]);
          console.log("token:", tok.type, _preprocessor_js$repr(chunk), tok.value ? _preprocessor_js$repr(tok.value) : "-", "" + tok.loc.start.line + ":" + tok.loc.start.column + "–" + tok.loc.end.line + ":" + tok.loc.end.column);
          dstCode += chunk;
        }

        console.log(dstCode);

        return [this.srcfile.code, null];
      }
    }
  });

  return TokenEditor;
})();

var Preprocessor = (function () {
  function Preprocessor() {
    _classCallCheck(this, Preprocessor);

    this.codebuf = null;
  }

  _createClass(Preprocessor, {
    process: {
      value: function process(srcfile) {
        var editor = new TokenEditor(Tokenizer(srcfile.code), srcfile, function (token, editor) {
          if (token.type === "record") {
            console.log("Record!");
          }
        });
        return editor.edit();
      }
    }
  });

  return Preprocessor;
})();
"use strict";

var CodeBuffer = (function () {
  function CodeBuffer(sourceDir, target) {
    _classCallCheck(this, CodeBuffer);

    this.code = "";
    this.line = 0;
    this.column = 0;
    this.map = new _codebuf_js$sourceMap.SourceMapGenerator({ file: "out" });
    this.sourceDir = sourceDir ? sourceDir + "/" : "";
    this.target = target;
    this._nextAnonID = 0;
  }

  _createClass(CodeBuffer, {
    lineStart: {
      get: function () {
        Object.defineProperty(this, "lineStart", { value: "  , " });
        return "var ";
      }
    },
    addLine: {
      value: function addLine(linechunk, srcfilename, srcloc) {
        {
          if (linechunk.indexOf("\n") !== -1) {
            throw new Error("unexpected linebreak in linechunk");
          }
        }
        this.code += linechunk + "\n";
        if (srcloc) {
          this.addSrcLocMapping(srcloc, srcfilename, { line: this.line, column: 1 }, { line: this.line, column: linechunk.length });
        }
        ++this.line;
      }
    },
    appendCode: {
      value: function appendCode(code, srcloc, srcfilename) {
        var startLine = this.line;
        code = code.trim();
        var lines = code.split(/\r?\n/);
        this.code += code + "\n";
        this.line += lines.length + 1;
        var genStart = { line: startLine, column: 1 };
        var genEnd = { line: this.line, column: lines[lines.length - 1].length };
        if (srcloc) {
          this.addSrcLocMapping(srcloc, srcfilename, genStart, genEnd);
        } else if (srcfilename) {
          this.map.addMapping({
            original: { line: 1, column: 1 },
            generated: genStart,
            source: srcfilename });
          this.map.addMapping({
            original: { line: lines.length, column: 1 },
            generated: genEnd,
            source: srcfilename });
        }
      }
    },
    addSrcLocMapping: {
      value: function addSrcLocMapping(srcloc, srcfilename, genStart, genEnd) {
        srcfilename = this.sourceDir + _codebuf_js$path.basename(srcfilename || srcloc.filename);
        this.map.addMapping({
          original: {
            line: srcloc.startLine === undefined ? srcloc.start.line : srcloc.startLine,
            column: srcloc.startColumn === undefined ? srcloc.start.column : srcloc.startColumn },
          generated: genStart,
          source: srcfilename });
        this.map.addMapping({
          original: {
            line: srcloc.endLine === undefined ? srcloc.end.line : srcloc.endLine,
            column: srcloc.endColumn === undefined ? srcloc.end.column : srcloc.endColumn },
          generated: genEnd,
          source: srcfilename });
      }
    },
    addMappedCode: {
      value: function addMappedCode(code, map) {
        var _this = this;

        var consumer = new _codebuf_js$sourceMap.SourceMapConsumer(map);

        for (var i = 0, L = map.sources.length; i !== L; i++) {
          var filename = this.sourceDir + map.sources[i];
          this.map._sources.add(filename);
          this.map.setSourceContent(filename, map.sourcesContent[i]);
        }

        consumer.eachMapping(function (mapping) {
          _this.map._mappings.add({
            generatedLine: mapping.generatedLine + _this.line,
            generatedColumn: mapping.generatedColumn,
            originalLine: mapping.originalLine,
            originalColumn: mapping.originalColumn,
            source: _this.sourceDir + _codebuf_js$path.basename(mapping.source) });
        });

        this.code += code + "\n";
        this.line += code.split(/\r?\n/).length;
      }
    },
    addRuntimeImports: {
      value: function addRuntimeImports(runtimeImps, isLast) {
        var runtimeRefs = _core.Object.keys(runtimeImps);
        for (var i = 0; i !== runtimeRefs.length; i++) {
          var ref = runtimeRefs[i];
          var imp = runtimeImps[ref];

          var spec = imp.specifiers[0];
          if (spec.id.name === "default") {
            this.addLine(this.lineStart + spec.name.name + " = __$irt(" + JSON.stringify(ref) + ")" + (isLast && i === runtimeRefs.length - 1 ? ";" : ""));
          } else {
            throw new Error("unexpected runtime helper import: importing member, not default");
          }
        }
      }
    },
    addModuleImports: {
      value: function addModuleImports(importRefs) {
        var _this = this;

        var imports = {};
        var refs = _core.Object.keys(importRefs);
        refs.forEach(function (ref, index) {
          imports[ref] = {
            nodes: importRefs[ref],
            names: _this.addModuleImport(ref, importRefs[ref], index, refs.length) };
        });
        return imports;
      }
    },
    addModuleImport: {
      value: function addModuleImport(ref, imps, index, count) {
        var names = [];
        var defaultIDName;
        var isLastImp = index === count - 1;

        if (imps.length === 1) {
          if (imps[0].specifiers.length === 1) {
            return [this.addImport(imps[0], this.genRequireExpr(ref), imps[0].specifiers[0], isLastImp)];
          }
        }

        var defaultImp = this._defaultNameForImports(imps);

        if (defaultImp) {
          defaultIDName = defaultImp.spec.name.name;
          names.push(this.addImport(defaultImp.imp, this.genRequireExpr(ref), defaultImp.spec, isLastImp && imps.length === 1));
        } else {
          defaultIDName = this.anonIDName();
          this.addLine(this.lineStart + defaultIDName + " = " + this.genRequireExpr(ref), imps[0].srcfile.name, imps[0].source.loc);
        }

        var specs,
            remainingImps = (function () {
          var _remainingImps = [];
          var _iteratorNormalCompletion = true;
          var _didIteratorError = false;
          var _iteratorError = undefined;

          try {
            for (var _iterator = _core.$for.getIterator(imps), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
              (function () {
                var imp = _step.value;

                if ((specs = (function () {
                  var _specs = [];
                  var _iteratorNormalCompletion2 = true;
                  var _didIteratorError2 = false;
                  var _iteratorError2 = undefined;

                  try {
                    for (var _iterator2 = _core.$for.getIterator(imp.specifiers), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                      var s = _step2.value;

                      if (s.name.name !== defaultIDName) {
                        _specs.push(s);
                      }
                    }
                  } catch (err) {
                    _didIteratorError2 = true;
                    _iteratorError2 = err;
                  } finally {
                    try {
                      if (!_iteratorNormalCompletion2 && _iterator2["return"]) {
                        _iterator2["return"]();
                      }
                    } finally {
                      if (_didIteratorError2) {
                        throw _iteratorError2;
                      }
                    }
                  }

                  return _specs;
                })()).length) {
                  _remainingImps.push({ imp: imp, specs: specs });
                }
              })();
            }
          } catch (err) {
            _didIteratorError = true;
            _iteratorError = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion && _iterator["return"]) {
                _iterator["return"]();
              }
            } finally {
              if (_didIteratorError) {
                throw _iteratorError;
              }
            }
          }

          return _remainingImps;
        })();

        for (var i = 0; i !== remainingImps.length; i++) {
          var _remainingImps$i = remainingImps[i];
          var imp = _remainingImps$i.imp;
          var _specs = _remainingImps$i.specs;

          var isLast = isLastImp && i === remainingImps.length - 1;
          for (var _i = 0, lastIndex = _specs.length - 1; _i !== _specs.length; _i++) {
            var spec = _specs[_i];
            names.push(this.addImport(imp, defaultIDName, spec, isLast && _i === lastIndex));
          }
        }

        return names;
      }
    },
    _defaultNameForImports: {
      value: function _defaultNameForImports(imps) {
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = _core.$for.getIterator(imps), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var imp = _step.value;
            var _iteratorNormalCompletion2 = true;
            var _didIteratorError2 = false;
            var _iteratorError2 = undefined;

            try {
              for (var _iterator2 = _core.$for.getIterator(imp.specifiers), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                var spec = _step2.value;

                if (spec["default"]) {
                  return { imp: imp, spec: spec };
                }
              }
            } catch (err) {
              _didIteratorError2 = true;
              _iteratorError2 = err;
            } finally {
              try {
                if (!_iteratorNormalCompletion2 && _iterator2["return"]) {
                  _iterator2["return"]();
                }
              } finally {
                if (_didIteratorError2) {
                  throw _iteratorError2;
                }
              }
            }
          }
        } catch (err) {
          _didIteratorError = true;
          _iteratorError = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion && _iterator["return"]) {
              _iterator["return"]();
            }
          } finally {
            if (_didIteratorError) {
              throw _iteratorError;
            }
          }
        }
      }
    },
    addImport: {
      value: function addImport(imp, impExprCode, spec, isLast) {
        var close = isLast ? ";" : "";
        if (spec["default"]) {
          this.addLine(this.lineStart + spec.name.name + " = " + impExprCode + close, imp.srcfile.name, imp.loc);
          return "default";
        } else if (spec.type === "ImportBatchSpecifier") {
          var idname = spec.name._origName || spec.name.name;
          if (impExprCode.substr(0, 5) === "__$i(") {
            impExprCode = "__$iw(" + impExprCode.substr(5);
          } else {
            impExprCode = "__$imw(" + impExprCode.substr(6);
          }
          this.addLine(this.lineStart + spec.name.name + " = " + impExprCode + close, imp.srcfile.name, imp.loc);
          return idname;
        } else {
          var idname = spec.id._origName || spec.id.name;
          this.addLine(this.lineStart + spec.name.name + " = " + impExprCode + "." + idname + close, imp.srcfile.name, imp.loc);
          return idname;
        }
      }
    },
    genRequireExpr: {
      value: function genRequireExpr(ref) {
        var m = undefined;
        if (NPMPkg.refIsNPM(ref)) {
          return "__$i(require(" + JSON.stringify(NPMPkg.stripNPMRefPrefix(ref)) + "))";
        } else if (ref[0] === "." || ref[0] === "/" || this.target.builtInModuleRefs[ref]) {
          return "__$i(require(" + JSON.stringify(ref) + "))";
        } else {
          return "__$im(require," + JSON.stringify(ref) + ")";
        }
      }
    },
    anonIDName: {
      value: function anonIDName() {
        return "_$$" + (this._nextAnonID++).toString(36);
      }
    }
  });

  return CodeBuffer;
})();
"use strict";

_compile_js$babel.transform.transformers["jo.classes"] = new _compile_js$Transformer("jo.classes", _compile_js$ClassHierarchyTransformer);
_compile_js$babel.transform.transformers["jo.modules"] = new _compile_js$Transformer("jo.modules", _compile_js$ModuleTransformer);
_compile_js$babel.transform.transformers["jo.fileLocalVars"] = new _compile_js$Transformer("jo.fileLocalVars", _compile_js$FileLocalVarsTransformer);

function ExportError(file, node, message, fixSuggestion, related) {
  return _compile_js$SrcError("ExportError", _compile_js$SrcLocation(node, file), message, fixSuggestion, related);
}

function ReferenceError(file, node, message, related) {
  return _compile_js$SrcError("ReferenceError", _compile_js$SrcLocation(node, file), message, null, related);
}

function CyclicReferenceError(pkg, name, fileA, fileB, deps, onlyClasses) {
  var errs = [{ message: "\"" + name + "\" defined here",
    srcloc: _compile_js$SrcLocation(fileB.definedIDs[name].node, fileB) }, { message: "\"" + name + "\" referenced here",
    srcloc: _compile_js$SrcLocation(fileA.unresolvedIDs[name].node, fileA) }];
  deps.forEach(function (dep) {
    if (!onlyClasses || dep.defNode.type === "ClassExpression") {
      errs.push({
        message: "\"" + dep.name + "\" defined here",
        srcloc: _compile_js$SrcLocation(dep.defNode, fileA)
      });
      errs.push({
        message: "\"" + dep.name + "\" referenced here",
        srcloc: _compile_js$SrcLocation(dep.refNode, fileB)
      });
    }
  });
  return ReferenceError(null, null, "cyclic dependency between source files \"" + fileA.name + "\" and \"" + fileB.name + "\"" + (" in package \"" + pkg.id + "\""), errs);
}

var PkgCompiler = (function () {
  function PkgCompiler(pkg, mod, target, depLevel) {
    _classCallCheck(this, PkgCompiler);

    this.pkg = pkg;
    this.module = mod;
    this.target = target;
    this.log = this.target.log;
    this.depLevel = depLevel;
    this._nextAnonID = 0;
  }

  _createClass(PkgCompiler, {
    compile: {
      value: _asyncToGenerator(function* (srcfiles) {
        yield this.parseFiles(srcfiles);

        this.resolveInterFileDeps(srcfiles);

        srcfiles = this.sortFiles(srcfiles);

        if (this.log.level >= Logger.DEBUG) {
          this.log.debug(this.buildDepDescription(srcfiles));
        }

        var codebuf = new CodeBuffer(_compile_js$path.resolve(this.pkg.dir), this.target);

        this.genHeader(srcfiles, codebuf);

        for (var i = 0, L = srcfiles.length; i !== L; i++) {
          var srcfile = srcfiles[i];
          codebuf.addMappedCode(srcfile.parsed.code, srcfile.parsed.map);
        }

        this.genFooter(srcfiles, codebuf);

        return codebuf;
      })
    },
    genHeader: {
      value: function genHeader(srcfiles, codebuf) {
        var runtimeImps = {};

        var importRefs = {};

        for (var i = 0, L = srcfiles.length; i !== L; ++i) {
          var srcfile = srcfiles[i];
          var imports = srcfile.parsed.imports;
          var _iteratorNormalCompletion = true;
          var _didIteratorError = false;
          var _iteratorError = undefined;

          try {
            for (var _iterator = _core.$for.getIterator(imports), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
              var imp = _step.value;

              if (imp.jo_isRuntimeHelper) {
                runtimeImps[imp.source.value] = imp;
              } else {
                imp.srcfile = srcfile;
                var impRefs = importRefs[imp.source.value];
                if (impRefs) {
                  impRefs.push(imp);
                } else {
                  importRefs[imp.source.value] = impRefs = [imp];
                }
              }
            }
          } catch (err) {
            _didIteratorError = true;
            _iteratorError = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion && _iterator["return"]) {
                _iterator["return"]();
              }
            } finally {
              if (_didIteratorError) {
                throw _iteratorError;
              }
            }
          }
        }

        var runtimeRefPrefixLen = "babel-runtime/".length;
        var pkginfo = {
          files: this.pkg.files,
          imports: _core.Object.keys(importRefs),
          exports: _core.Object.keys(this.pkg.exports),
          "babel-runtime": _core.Object.keys(runtimeImps).map(function (ref) {
            return ref.substr(runtimeRefPrefixLen);
          }),
          version: Date.now().toString(36) };
        if (this.pkg.hasMainFunc) {
          pkginfo.main = true;
        }
        this.pkg.pkgInfo = pkginfo;

        if (this.target.pkgModuleHeader) {
          var targetHeaderCode = this.target.pkgModuleHeader(this.pkg, this.depLevel);
          if (targetHeaderCode) {
            targetHeaderCode.trim().split(/\r?\n/g).forEach(function (line) {
              codebuf.addLine(line);
            });
          }
        }

        codebuf.addLine("//#jopkg" + JSON.stringify(pkginfo));

        if (_core.Object.keys(runtimeImps).length !== 0 || _core.Object.keys(importRefs).length !== 0) {
          codebuf.addRuntimeImports(runtimeImps, _core.Object.keys(importRefs).length === 0);

          this.pkg.imports = codebuf.addModuleImports(importRefs);
        }
      }
    },
    genFooter: {
      value: function genFooter(srcfiles, codebuf) {
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = _core.$for.getIterator(srcfiles), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var srcfile = _step.value;

            if (srcfile.initFuncName) {
              codebuf.addLine(srcfile.initFuncName + "();");
            }
          }
        } catch (err) {
          _didIteratorError = true;
          _iteratorError = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion && _iterator["return"]) {
              _iterator["return"]();
            }
          } finally {
            if (_didIteratorError) {
              throw _iteratorError;
            }
          }
        }

        this.genExports(srcfiles, codebuf);

        if (this.target.pkgModuleFooter) {
          var s = this.target.pkgModuleFooter(this.pkg, this.depLevel);
          if (s) {
            s.trim().split(/\r?\n/g).forEach(function (line) {
              codebuf.addLine(line);
            });
          }
        }

        if (this.module.file) {
          codebuf.addLine("//#sourceMappingURL=" + _compile_js$path.basename(this.module.file) + ".map");
        }
      }
    },
    exportsGroupedByFile: {
      value: function exportsGroupedByFile(srcfiles) {
        var exports = {};
        for (var _name in this.pkg.exports) {
          var exp = this.pkg.exports[_name];
          var expv = exports[exp.file.name];
          if (!expv) {
            exports[exp.file.name] = [exp];
          } else {
            expv.push(exp);
          }
        }
        return exports;
      }
    },
    genExports: {
      value: function genExports(srcfiles, codebuf) {
        var exportsByFile = this.exportsGroupedByFile(srcfiles);
        var exportFilenames = _core.Object.keys(exportsByFile);
        if (exportFilenames.length === 0) {
          return;
        }

        var t = _compile_js$babel.types;

        for (var filename in exportsByFile) {
          var _exports = exportsByFile[filename];

          var srcfile = _exports[0].file;

          var _iteratorNormalCompletion = true;
          var _didIteratorError = false;
          var _iteratorError = undefined;

          try {
            for (var _iterator = _core.$for.getIterator(_exports), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
              var exp = _step.value;

              var ast = { type: "Program", body: [], comments: [], tokens: [] };
              var memberExpr = undefined;

              if (exp.name === "default") {
                codebuf.appendCode(this.codegen(t.expressionStatement(t.assignmentExpression("=", t.memberExpression(t.identifier("exports"), t.identifier("__esModule")), t.literal(true)))));

                memberExpr = t.memberExpression(t.identifier("exports"), t.literal(exp.name), true);
              } else {
                memberExpr = t.memberExpression(t.identifier("exports"), t.identifier(exp.name));
              }

              var assignmentExpr = t.assignmentExpression("=", memberExpr, exp.node);
              var code = this.codegen(t.expressionStatement(assignmentExpr));
              codebuf.appendCode(code, _compile_js$SrcLocation(exp.node, exp.file));
            }
          } catch (err) {
            _didIteratorError = true;
            _iteratorError = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion && _iterator["return"]) {
                _iterator["return"]();
              }
            } finally {
              if (_didIteratorError) {
                throw _iteratorError;
              }
            }
          }
        }
      }
    },
    codegen: {
      value: function codegen(ast) {
        return _compile_js$BabelGen(ast, {
          code: true,
          ast: false,
          experimental: true,
          compact: this.target.mode === TARGET_MODE_RELEASE,
          comments: this.target.mode === TARGET_MODE_DEV,
          returnUsedHelpers: false }).code;
      }
    },
    parseFiles: {
      value: function parseFiles(srcfiles) {
        var _this = this;

        return _core.Promise.all(srcfiles.map(_asyncToGenerator(function* (srcfile, index) {
          srcfile.code = yield _compile_js$fs.readFile(srcfile.dir + "/" + srcfile.name, "utf8");
          srcfile.id = srcfile.name.replace(/[^a-z0-9_]/g, "_");
          try {
            var code = srcfile.code;
            var sourceMap = null;
            srcfile.parsed = _this.parseFile(srcfile, code, sourceMap);
          } catch (err) {
            if (!err.srcfile) err.file = srcfile;
            throw err;
          }
        })));
      }
    },
    preprocessFile: {
      value: function preprocessFile(srcfile) {
        var pp = new Preprocessor();
        return pp.process(srcfile);
      }
    },
    parseFile: {
      value: function parseFile(srcfile, code, inSourceMap) {
        var _this = this;

        var bopts = {
          filename: srcfile.name,
          inputSourceMap: inSourceMap,
          sourceMap: true,
          sourceMapName: "out.map",
          sourceRoot: srcfile.dir,
          code: true,
          ast: false,
          experimental: true,
          compact: false,
          comments: this.target.mode === TARGET_MODE_DEV,
          returnUsedHelpers: false,
          modules: "ignore",
          blacklist: this.target.disabledTransforms(["es6.modules"]),
          optional: this.target.transforms(["jo.modules", "runtime"]).concat(["jo.classes", "jo.fileLocalVars"]) };

        var T = _compile_js$babel.types;
        var bfile = new _compile_js$BabelFile(bopts);

        var tKeys = (function () {
          var _tKeys = [];
          var _iteratorNormalCompletion = true;
          var _didIteratorError = false;
          var _iteratorError = undefined;

          try {
            for (var _iterator = _core.$for.getIterator(bfile.transformerStack), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
              var t = _step.value;

              _tKeys.push(t.transformer.key);
            }
          } catch (err) {
            _didIteratorError = true;
            _iteratorError = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion && _iterator["return"]) {
                _iterator["return"]();
              }
            } finally {
              if (_didIteratorError) {
                throw _iteratorError;
              }
            }
          }

          return _tKeys;
        })();
        var beforeIndex = tKeys.indexOf("utility.deadCodeElimination");
        if (beforeIndex === -1) {
          beforeIndex = tKeys.indexOf("_cleanUp");
        }
        var startKey = tKeys.indexOf("jo.modules");
        var endKey = tKeys.indexOf("jo.fileLocalVars");
        var joTransformers = bfile.transformerStack.splice(startKey, endKey - startKey + 1);
        joTransformers.splice(0, 0, beforeIndex, 0);
        bfile.transformerStack.splice.apply(bfile.transformerStack, joTransformers);

        tKeys = (function () {
          var _tKeys2 = [];
          var _iteratorNormalCompletion = true;
          var _didIteratorError = false;
          var _iteratorError = undefined;

          try {
            for (var _iterator = _core.$for.getIterator(bfile.transformerStack), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
              var t = _step.value;

              _tKeys2.push(t.transformer.key);
            }
          } catch (err) {
            _didIteratorError = true;
            _iteratorError = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion && _iterator["return"]) {
                _iterator["return"]();
              }
            } finally {
              if (_didIteratorError) {
                throw _iteratorError;
              }
            }
          }

          return _tKeys2;
        })();
        var joClassTIndex = tKeys.indexOf("jo.classes");
        if (joClassTIndex !== -1) {
          var es6ClassTIndex = tKeys.indexOf("es6.classes");
          if (es6ClassTIndex !== -1 && joClassTIndex > es6ClassTIndex) {
            bfile.transformerStack.splice(es6ClassTIndex, 0, bfile.transformerStack.splice(joClassTIndex, 1)[0]);
          }
        }

        bfile.jofile = srcfile;
        bfile.joFileIDName = "_" + srcfile.id;
        bfile.joFirstNonImportOffset = Infinity;
        bfile.joImports = [];
        bfile.joPkg = this.pkg;
        bfile.joTarget = this.target;

        bfile.joAddImplicitImport = function (ref, specs) {
          var node = arguments[2] === undefined ? null : arguments[2];

          bfile.joImports.push({
            jo_isImplicitImport: true,
            source: { value: ref },
            loc: node ? node.loc : null,
            specifiers: _core.Object.keys(specs).map(function (id) {
              return {
                id: { name: id },
                name: { name: specs[id] },
                srcfile: srcfile,
                "default": id === "default"
              };
            }) });
        };

        bfile.joRegisterExport = function (name, node) {
          var isImplicitExport = arguments[2] === undefined ? false : arguments[2];

          var errmsg,
              existingExport = bfile.joPkg.exports[name];

          if (existingExport) {
            if (existingExport.node === node) {
              if (_this.log.level >= Logger.INFO) {
                _this.log.info(_compile_js$SrcError.formatSource(_compile_js$SrcLocation(node, bfile.jofile), "\"export\" statement has no effect on already implicitly-exported symbol", null, "magenta", 0));
              }
              return;
            }
            errmsg = name === "default" ? "duplicate default export in package" : "duplicate exported symbol in package";
            throw ExportError(bfile.jofile, node, errmsg, null, [{ message: "also exported here",
              srcloc: _compile_js$SrcLocation(existingExport.node, existingExport.file) }]);
          }

          if (name === "default") {
            (function () {
              var prevExports = [],
                  prevExportsLimit = 3;
              _core.Object.keys(bfile.joPkg.exports).forEach(function (k) {
                var exp = bfile.joPkg.exports[k];
                if (!exp.isImplicit && prevExports.length < prevExportsLimit) {
                  prevExports.push({
                    message: "specific export here",
                    srcloc: _compile_js$SrcLocation(exp.node, exp.file)
                  });
                }
              });
              if (prevExports.length) {
                throw ExportError(bfile.jofile, node, "default export mixed with specific export", null, prevExports);
              }

              bfile.joPkg.exports = {};
            })();
          } else {
            var defaultExp = bfile.joPkg.exports["default"];
            if (defaultExp) {
              if (isImplicitExport) {
                return;
              }
              throw ExportError(bfile.jofile, node, "specific export mixed with default export", null, [{
                message: "default export here",
                srcloc: _compile_js$SrcLocation(defaultExp.node, defaultExp.file)
              }]);
            }
          }

          bfile.joPkg.exports[name] = {
            name: name,
            file: bfile.jofile,
            node: node,
            isImplicit: isImplicitExport
          };
        };

        bfile.joRemappedIdentifiers = {};
        bfile.joLocalizeIdentifier = function (name) {
          var newID = T.identifier(bfile.joFileIDName + "$" + name);
          this.joRemappedIdentifiers[name] = newID.name;
          return newID;
        };

        var res = bfile.parse(code);
        res.imports = bfile.joImports;

        return (res
        );
      }
    },
    resolveInterFileDeps: {
      value: function resolveInterFileDeps(srcfiles) {
        var _this = this;

        this._detectedDependencies = {};
        var pkg = this.pkg;

        for (var x = 0; x !== srcfiles.length; x++) {
          for (var y = 0; y !== srcfiles.length; y++) {
            if (x !== y) {
              this._resolveFileDeps(srcfiles[x], srcfiles[y]);
            }
          }
        }

        var errs = [];
        srcfiles.forEach(function (file) {
          if (file.unresolvedIDs && _core.Object.keys(file.unresolvedIDs).length !== 0) {
            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
              for (var _iterator = _core.$for.getIterator(_core.Object.keys(file.unresolvedIDs)), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                var _name = _step.value;

                var node = file.unresolvedIDs[_name].node;
                if (!node.loc) {
                  continue;
                }
                var err = _compile_js$SrcError("ReferenceError", _compile_js$SrcLocation(node, file), "unresolvable identifier \"" + _name + "\"");
                var suggestions = _this.findIDSuggestions(srcfiles, _name);
                if (suggestions.length !== 0) {
                  err.suggestion = _this.formatIDSuggestions(suggestions);
                }
                errs.push(err);
              }
            } catch (err) {
              _didIteratorError = true;
              _iteratorError = err;
            } finally {
              try {
                if (!_iteratorNormalCompletion && _iterator["return"]) {
                  _iterator["return"]();
                }
              } finally {
                if (_didIteratorError) {
                  throw _iteratorError;
                }
              }
            }
          }
        });
        if (errs.length !== 0) {
          throw _compile_js$SrcErrors(errs);
        }
      }
    },
    findIDSuggestions: {
      value: function findIDSuggestions(srcfiles, name) {
        var depth = arguments[2] === undefined ? 0 : arguments[2];

        var sv = [];
        var km = {};
        var nameLowerCase = name.toLowerCase();
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = _core.$for.getIterator(srcfiles), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var srcfile = _step.value;

            var foundCloseMatch = false;
            for (var k in srcfile.definedIDs) {
              var id = srcfile.definedIDs[k];
              if (id.kind === "module" || id.kind === "uid" || !id.node.loc) {
                continue;
              }
              var d = 0;
              if (nameLowerCase === k.toLowerCase()) {
                foundCloseMatch = true;
              } else {
                d = _compile_js$LevenshteinDistance(name, k);
              }
              if (d <= 2 && !km[k]) {
                sv.push(km[k] = { d: d, name: k, srcloc: _compile_js$SrcLocation(id.node, srcfile) });
              }
            }

            for (var k in this.target.builtInModuleRefs) {
              if (!km[k] && k.toLowerCase() === nameLowerCase) {
                sv.push(km[k] = { d: 0, name: k, isModule: true });
              }
            }
          }
        } catch (err) {
          _didIteratorError = true;
          _iteratorError = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion && _iterator["return"]) {
              _iterator["return"]();
            }
          } finally {
            if (_didIteratorError) {
              throw _iteratorError;
            }
          }
        }

        return sv.sort(function (a, b) {
          return a.d - b.d;
        });
      }
    },
    formatIDSuggestions: {
      value: function formatIDSuggestions(suggestions) {
        return "Did you mean" + (suggestions.length > 1 ? ":\n  " : " ") + suggestions.map(function (s) {
          if (s.isModule) {
            return "built-in module \"" + _compile_js$TermStyle.stdout.boldCyan(s.name) + "\"";
          } else {
            return _compile_js$TermStyle.stdout.boldCyan(s.name) + " defined in " + s.srcloc.formatFilename("green");
          }
        }).join("\n  ");
      }
    },
    buildDepDescription: {
      value: function buildDepDescription(srcfiles) {
        var _this = this;

        var intersectKeys = function intersectKeys(a, b) {
          return (function () {
            var _ref = [];
            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
              for (var _iterator = _core.$for.getIterator(_core.Object.keys(a)), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                var k = _step.value;

                if (b[k]) {
                  _ref.push(k);
                }
              }
            } catch (err) {
              _didIteratorError = true;
              _iteratorError = err;
            } finally {
              try {
                if (!_iteratorNormalCompletion && _iterator["return"]) {
                  _iterator["return"]();
                }
              } finally {
                if (_didIteratorError) {
                  throw _iteratorError;
                }
              }
            }

            return _ref;
          })();
        };

        var msg = this.log.style.boldGreen(this.pkg.id) + " inter-file dependencies:";
        var filenames = (function () {
          var _filenames = [];
          var _iteratorNormalCompletion = true;
          var _didIteratorError = false;
          var _iteratorError = undefined;

          try {
            for (var _iterator = _core.$for.getIterator(srcfiles), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
              var f = _step.value;

              if (_this._detectedDependencies[f.name]) {
                _filenames.push(f.name);
              }
            }
          } catch (err) {
            _didIteratorError = true;
            _iteratorError = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion && _iterator["return"]) {
                _iterator["return"]();
              }
            } finally {
              if (_didIteratorError) {
                throw _iteratorError;
              }
            }
          }

          return _filenames;
        })();

        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = _core.$for.getIterator(filenames), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var _iteratorNormalCompletion2;

            var _didIteratorError2;

            var _iteratorError2;

            var _iterator2, _step2;

            var _iteratorNormalCompletion3;

            var _didIteratorError3;

            var _iteratorError3;

            var _iterator3, _step3;

            (function () {
              var filename = _step.value;

              var depnames = _compile_js$Unique(_this._detectedDependencies[filename].map(function (d) {
                return d.file.name;
              }));
              msg += "\n  " + _this.log.style.boldCyan(filename) + " depends on:";

              var refs = {};
              var dependeeFile = null;
              _this._detectedDependencies[filename].forEach(function (dep) {
                if (!refs[dep.file.name]) {
                  refs[dep.file.name] = {};
                }
                for (var k in dep.file.definedIDs) {
                  refs[dep.file.name][k] = { id: dep.file.definedIDs[k], file: dep.file };
                }

                dependeeFile = dep.dependeeFile;
              });

              _iteratorNormalCompletion2 = true;
              _didIteratorError2 = false;
              _iteratorError2 = undefined;

              try {
                for (_iterator2 = _core.$for.getIterator(_core.Object.keys(refs)); !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                  var fn = _step2.value;

                  var ref = refs[fn];
                  var ids = intersectKeys(ref, dependeeFile.resolvedIDs);

                  msg += "\n    " + _this.log.style.boldYellow(fn);

                  _iteratorNormalCompletion3 = true;
                  _didIteratorError3 = false;
                  _iteratorError3 = undefined;

                  try {
                    for (_iterator3 = _core.$for.getIterator(ids); !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                      var id = _step3.value;

                      var node = ref[id].id.node;
                      if (node.type === "FunctionDeclaration" || node.type === "ClassExpression") {
                        node = node.id;
                      }
                      var srcloc = _compile_js$SrcLocation(node, ref[id].file);
                      var ln = "\n    ";
                      msg += ln + srcloc.formatCode("boldYellow", 0, 0).join(ln);
                    }
                  } catch (err) {
                    _didIteratorError3 = true;
                    _iteratorError3 = err;
                  } finally {
                    try {
                      if (!_iteratorNormalCompletion3 && _iterator3["return"]) {
                        _iterator3["return"]();
                      }
                    } finally {
                      if (_didIteratorError3) {
                        throw _iteratorError3;
                      }
                    }
                  }
                }
              } catch (err) {
                _didIteratorError2 = true;
                _iteratorError2 = err;
              } finally {
                try {
                  if (!_iteratorNormalCompletion2 && _iterator2["return"]) {
                    _iterator2["return"]();
                  }
                } finally {
                  if (_didIteratorError2) {
                    throw _iteratorError2;
                  }
                }
              }
            })();
          }
        } catch (err) {
          _didIteratorError = true;
          _iteratorError = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion && _iterator["return"]) {
              _iterator["return"]();
            }
          } finally {
            if (_didIteratorError) {
              throw _iteratorError;
            }
          }
        }

        return msg;
      }
    },
    fileDependsOn: {
      value: function fileDependsOn(fileA, fileB) {
        var dep = this._detectedDependencies[fileA.name];
        if (dep && dep.some(function (o) {
          return o.file === fileB;
        })) {
          return dep;
        }
      }
    },
    fileDependsOnClasses: {
      value: function fileDependsOnClasses(fileA, fileB) {
        var dep = this._detectedDependencies[fileA.name];

        if (dep && dep.some(function (o) {
          return o.file === fileB && o.defNode.type === "ClassExpression";
        })) {
          return dep;
        }
      }
    },
    _resolveFileDeps: {
      value: function _resolveFileDeps(fileA, fileB) {
        if (!fileA.unresolvedIDs || !fileB.definedIDs) {
          return;
        }

        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = _core.$for.getIterator(_core.Object.keys(fileA.unresolvedIDs)), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var _name = _step.value;

            var definition = fileB.definedIDs[_name];
            if (definition) {
              var classRef = fileA.unresolvedSuperclassIDs ? fileA.unresolvedSuperclassIDs[_name] : null;

              var deps = undefined;
              if (classRef && (deps = this.fileDependsOnClasses(fileB, fileA))) {
                throw CyclicReferenceError(this.pkg, _name, fileA, fileB, deps, true);
              }

              var fileDeps = this._detectedDependencies[fileA.name];
              if (!fileDeps) {
                this._detectedDependencies[fileA.name] = fileDeps = [];
              }
              fileDeps.push({
                dependeeFile: fileA,
                file: fileB,
                name: _name,
                defNode: definition.node,
                refNode: fileA.unresolvedIDs[_name].node });

              if (!fileA.resolvedIDs) {
                fileA.resolvedIDs = {};
              }
              fileA.resolvedIDs[_name] = fileA.unresolvedIDs[_name];
              if (_core.Object.keys(fileA.unresolvedIDs).length === 1) {
                fileA.unresolvedIDs = null;
              } else {
                delete fileA.unresolvedIDs[_name];
              }
            }
          }
        } catch (err) {
          _didIteratorError = true;
          _iteratorError = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion && _iterator["return"]) {
              _iterator["return"]();
            }
          } finally {
            if (_didIteratorError) {
              throw _iteratorError;
            }
          }
        }
      }
    },
    sortFiles: {
      value: function sortFiles(srcfiles) {
        var _this = this;

        srcfiles = srcfiles.slice();
        srcfiles.sort(function (fileA, fileB) {
          if (fileA.unresolvedSuperclassIDs || fileB.unresolvedSuperclassIDs) {
            if (_this.fileDependsOnClasses(fileA, fileB)) {
              return 1;
            }

            if (_this.fileDependsOnClasses(fileB, fileA)) {
              return -1;
            }
          }

          if (_this.fileDependsOn(fileA, fileB)) {
            return 1;
          }

          if (_this.fileDependsOn(fileB, fileA)) {
            return -1;
          }

          return 0;
        });

        var ts = [];
        var NONE = { name: "NONE" };
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = _core.$for.getIterator(srcfiles), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var fileA = _step.value;

            var deps = this._detectedDependencies[fileA.name];
            if (deps && deps.length !== 0) {
              var _iteratorNormalCompletion2 = true;
              var _didIteratorError2 = false;
              var _iteratorError2 = undefined;

              try {
                for (var _iterator2 = _core.$for.getIterator(deps), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                  var dep = _step2.value;

                  ts.push([fileA, dep.file]);
                }
              } catch (err) {
                _didIteratorError2 = true;
                _iteratorError2 = err;
              } finally {
                try {
                  if (!_iteratorNormalCompletion2 && _iterator2["return"]) {
                    _iterator2["return"]();
                  }
                } finally {
                  if (_didIteratorError2) {
                    throw _iteratorError2;
                  }
                }
              }
            } else {
              ts.push([fileA, NONE]);
            }
          }
        } catch (err) {
          _didIteratorError = true;
          _iteratorError = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion && _iterator["return"]) {
              _iterator["return"]();
            }
          } finally {
            if (_didIteratorError) {
              throw _iteratorError;
            }
          }
        }

        srcfiles = toposort(ts).filter(function (f) {
          return f !== NONE;
        }).reverse();

        return srcfiles;
      }
    }
  });

  return PkgCompiler;
})();
"use strict";

var kSpaces = "                                                                              ";
var slice = Array.prototype.slice;

var BuildCtx = (function () {
  function BuildCtx(target, logger, options) {
    _classCallCheck(this, BuildCtx);

    this.log = logger;
    this.target = target;
    this.options = options || { forceRebuild: false };
    this.builtPkgs = {};
    this.depth = 0;
    this.pkgs = [];
    this.termstyle = _build_js$TermStyle.stdout;
  }

  _createClass(BuildCtx, {
    registerBuiltPkg: {
      value: function registerBuiltPkg(pkg) {
        if (pkg.dir in this.builtPkgs) {
          return false;
        }
        this.builtPkgs[pkg.dir] = pkg;
        return true;
      }
    },
    getBuiltPkg: {
      value: function getBuiltPkg(pkgdir) {
        return this.builtPkgs[pkgdir];
      }
    },
    logIndent: {
      value: function logIndent() {
        return kSpaces.substr(0, this.depth * 2 - 1);
      }
    },
    logDebug: {
      value: function logDebug() {
        for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
          args[_key] = arguments[_key];
        }

        if (this.depth && this.log.level >= Logger.DEBUG) {
          var _log;

          (_log = this.log).debug.apply(_log, [this.logIndent()].concat(args));
        } else {
          var _log2;

          (_log2 = this.log).debug.apply(_log2, args);
        }
      }
    },
    logInfo: {
      value: function logInfo() {
        for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
          args[_key] = arguments[_key];
        }

        if (this.depth && this.log.level >= Logger.INFO) {
          var _log;

          (_log = this.log).info.apply(_log, [this.logIndent()].concat(args));
        } else {
          var _log2;

          (_log2 = this.log).info.apply(_log2, args);
        }
      }
    },
    logWarn: {
      value: function logWarn() {
        for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
          args[_key] = arguments[_key];
        }

        if (this.depth && this.log.level >= Logger.WARN) {
          var _log;

          (_log = this.log).warn.apply(_log, [this.logIndent()].concat(args));
        } else {
          var _log2;

          (_log2 = this.log).warn.apply(_log2, args);
        }
      }
    },
    logError: {
      value: function logError() {
        for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
          args[_key] = arguments[_key];
        }

        if (this.depth && this.log.level >= Logger.ERROR) {
          var _log;

          (_log = this.log).error.apply(_log, [this.logIndent()].concat(args));
        } else {
          var _log2;

          (_log2 = this.log).error.apply(_log2, args);
        }
      }
    },
    buildPkg: {
      value: _asyncToGenerator(function* (pkg) {
        var _this = this;

        if (!this.registerBuiltPkg(pkg)) {
          return;
        }

        var outdatedDeps = [];

        if (pkg.files[0].indexOf("__precompiled") === 0) {
          this.logInfo("using precompiled package", this.log.style.boldGreen(pkg.id));

          pkg.module = new PrecompiledModule(pkg.dir + "/" + PrecompiledModule.sourceFileForTarget(pkg.files, this.target));

          var targetFilename = this.target.precompiledModuleFilename(pkg, this.depth);
          if (targetFilename && targetFilename !== pkg.module.file) {
            yield pkg.module.copyToIfOutdated(targetFilename, pkg, this.target);
          }
        } else {
          this.logInfo("building source package", this.log.style.boldGreen(pkg.id));

          var srcfiles = yield pkg.loadSrcFiles();

          yield this.buildModule(pkg, srcfiles);
        }

        var _ref = yield this.resolvePkgDeps(pkg);

        var _ref2 = _slicedToArray(_ref, 2);

        pkg.deps = _ref2[0];
        outdatedDeps = _ref2[1];

        if (outdatedDeps.length !== 0) {
          yield* (function* () {
            var ctx = Object.create(_this, { depth: { value: _this.depth + 1, enumerable: true } });

            yield _core.Promise.all(outdatedDeps.map(function (pkg) {
              return ctx.buildPkg(pkg);
            }));
          })();
        }
      })
    },
    resolvePkgDeps: {
      value: _asyncToGenerator(function* (pkg) {
        var deps = [],
            outdatedDeps = [];
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = _core.$for.getIterator(_core.Object.keys(pkg.imports)), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var pkgref = _step.value;

            var depPkg = undefined;
            if (pkgref[0] === ".") {
              depPkg = this.getBuiltPkg(_build_js$path.normalize(pkg.dir + "/" + pkgref));
            }
            {
              var importedAt = undefined,
                  srcloc = null;
              if ((importedAt = pkg.imports[pkgref]) && importedAt.length !== 0) {
                srcloc = _build_js$SrcLocation(importedAt.nodes[0], importedAt.nodes[0].srcfile);
              }
              depPkg = yield pkg.pkgFromRef(pkgref, srcloc, this.target);
              if (!depPkg.isBuiltIn && !depPkg.isNPM) {
                var builtPkg = this.getBuiltPkg(depPkg.dir);
                if (builtPkg) {
                  depPkg = builtPkg;
                } else {
                  outdatedDeps.push(depPkg);
                }
              }
            }
            deps.push(depPkg);
          }
        } catch (err) {
          _didIteratorError = true;
          _iteratorError = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion && _iterator["return"]) {
              _iterator["return"]();
            }
          } finally {
            if (_didIteratorError) {
              throw _iteratorError;
            }
          }
        }

        return [deps, outdatedDeps];
      })
    },
    buildModule: {
      value: _asyncToGenerator(function* (pkg, srcfiles) {
        var mod = this.target.moduleForPackage(pkg, this.depth);
        pkg.module = mod;

        if (!mod.file || this.options.forceRebuild || (yield this.isModuleOutdated(pkg, mod, srcfiles))) {
          this.logDebug("compiling module for pkg", this.log.style.boldGreen(pkg.id));

          var compiler = new PkgCompiler(pkg, mod, this.target, this.depth);
          var compiled = yield compiler.compile(srcfiles);
          mod.code = compiled.code;
          mod.map = compiled.map;
          mod.stat = null;

          if (this.target.postCompile) {
            this.target.postCompile(pkg, this.depth);
          }

          if (mod.file) {
            this.logDebug("write module", this.log.style.boldMagenta(mod.file), "for package", this.log.style.boldGreen(pkg.id));
            yield writeCode(mod.code, mod.map, mod.file);
          }
        } else {
          this.logDebug("reusing up-to-date module for pkg", this.log.style.boldGreen(pkg.id));
        }

        return mod;
      })
    },
    isModuleOutdated: {
      value: _asyncToGenerator(function* (pkg, mod, srcfiles) {
        mod.stat = yield _build_js$fs.stat(mod.file);
        var pkgid = this.log.style.boldGreen(pkg.id);
        if (!mod.stat) {
          return true;
        } else if (srcfiles.some(function (sf) {
          return sf.st.mtime > mod.stat.mtime;
        })) {
          this.logDebug("module is outdated (source files changed) for pkg", pkgid);
          return true;
        }

        yield mod.load();
        var pkginfo;
        try {
          pkginfo = Pkg.parsePkgInfo(mod.code);
          pkg.pkgInfo = pkginfo;
        } catch (err) {
          this.logWarn("error while loading module code:", err.message);
          return true;
        }

        var files = pkg.files.slice();
        if (files.length !== pkginfo.files.length) {
          this.logDebug("module is outdated (number of source files differ) for pkg", pkgid);
          return true;
        }
        files.sort();
        pkginfo.files.sort();
        for (var i = 0, L = files.length; i !== L; ++i) {
          if (files[i] !== pkginfo.files[i]) {
            this.logDebug("module is outdated (source files differ) for pkg", pkgid);
            return true;
          }
        }

        if (pkginfo.imports) {
          pkg.imports = {};
          var _iteratorNormalCompletion = true;
          var _didIteratorError = false;
          var _iteratorError = undefined;

          try {
            for (var _iterator = _core.$for.getIterator(pkginfo.imports), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
              var ref = _step.value;

              pkg.imports[ref] = [];
            }
          } catch (err) {
            _didIteratorError = true;
            _iteratorError = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion && _iterator["return"]) {
                _iterator["return"]();
              }
            } finally {
              if (_didIteratorError) {
                throw _iteratorError;
              }
            }
          }
        }

        return false;
      })
    }
  });

  return BuildCtx;
})();
"use strict";

var defaultTarget = TARGET_NODEJS;

var BuildCmd = {
  argdesc: "[input]", desc: "Builds programs and packages",
  usage: "[options] [<package>...]\n{{prog}} [options] <srcfile>...\n\nOptions:\n{{options}}\n\n<package>\n  If the arguments are a list of source files, build treats them as a list of\n  source files specifying a single package.\n\n  When the command line specifies a single main package, build writes the\n  resulting executable to -o=<file>. Otherwise build compiles the packages but\n  discards the results, serving only as a check that the packages can be built.\n\n  If no arguments are provided, the current working directory is assumed to be\n  a package.\n\n-o <file>\n  The -o flag specifies the output file name. If not specified, the output\n  file name depends on the arguments and derives from the name of the package,\n  such as p.pkg.js for package p, unless p is 'main'. If the package is main\n  and file names are provided, the file name derives from the first file name\n  mentioned, such as f1 for '{{prog}} f1.js f2.js'; with no files provided\n  ('{{prog}}'), the output file name is the base name of the containing\n  directory. If \"-\" is specified as the output file, output is written to stdout.\n\n-target <target>\n  Specify product target, where <target> can be one of:\n{{targets}}\n",
  options: {
    o: "<file>        Output filename",
    target: "<target> Generate product for \"browser\", \"browser-webkit\" or \"nodejs\" (default)",
    a: "              Force rebuilding of packages that are already up-to-date",
    globals: "<names> Comma separated list of custom global JS identifiers",
    dev: "            Build a development version (unoptimized, debug checks, etc)",
    v: "              Print status messages",
    D: "              Print debugging messages, useful for developing jo",
    work: "       print the name of the temporary work directory and do not delete it when exiting" },

  main: _asyncToGenerator(function* (opts, args, usage, cb) {
    args = _cmd_build_js$Unique(args.filter(function (arg) {
      return arg.trim();
    }));

    if (opts.work) {
      console.log("workdir:", WorkDir.path);
    } else {
      WorkDir.enableRemoveAtExit();
    }

    var pkgs = [];

    if (args.length === 0) {
      pkgs = [yield Pkg.fromRef(".")];
    } else if (args.some(SrcFile.filenameMatches)) {
      pkgs = [Pkg.fromFiles(args)];
    } else {
      pkgs = yield _core.Promise.all(args.map(function (ref) {
        return Pkg.fromRef(ref);
      }));
    }

    if (pkgs.length > 1 && opts.o) {
      throw "-o can not be specified when building multiple packages";
    }

    var logger = new Logger(opts.D ? Logger.DEBUG : opts.v ? Logger.INFO : Logger.WARN);

    var targetMode = opts.dev ? TARGET_MODE_DEV : TARGET_MODE_RELEASE;
    var target = Target.create(opts.target || defaultTarget, targetMode, {
      logger: logger,
      output: opts.o,
      globals: opts.globals ? opts.globals.split(/[\s ]*,[\s ]*/g) : null });

    if (target.preMake) {
      yield target.preMake(pkgs);
    }

    var buildCtx = new BuildCtx(target, logger, { forceRebuild: opts.a });
    yield _core.Promise.all(pkgs.map(function (pkg) {
      return buildCtx.buildPkg(pkg);
    }));

    if (target.postMake) {
      yield target.postMake(pkgs);
    }
  }) };

function _cmd_build_js$init() {
  var targets = "";
  for (var targetID in Targets) {
    var target = Targets[targetID];
    targets += "    " + targetID + (targetID === defaultTarget ? " (default)" : "") + "\n";
  }
  var params = { targets: targets };
  BuildCmd.usage = BuildCmd.usage.replace(/\{\{([^\}]+)\}\}/g, function (_, k) {
    return params[k];
  });
}
"use strict";

var RemoteControlCmd = {
  desc: "Control Jo from another process",
  usage: "[-pid <pid>]\n\nOptions:\n{{options}}\n\n-pid <pid>\n  When -pid is provided, Jo will send heartbeat SIGCHLD signals to <pid> at\n  regular intervals. When such a heartbeat fail to deliver, the Jo process will\n  exit(1). This provides \"zombie\" protection i.e. when parent process crashes.\n\nCommunication\n  Remote-control mode uses stdio to communicate using JSON messages separated\n  by <LF> ('\\n'). When stdin closes, the Jo process will exit(0).\n\n  Sending an illegal command or arguments causes the Jo process to exit(1).\n\n  Caveats when issuing multiple concurrent commands:\n    - You should include an \"id\" property with some value that is unique to the\n      command request.\n    - Log messages will _not_ include an \"id\" and might be out-of order.\n    - When receiving a \"result\" message, you should compare its \"id\" property\n      to some internal set of \"pending requests\" to know what command request\n      actually finished.\n\nExample:\n  $ echo '{\"type\":\"runcmd\",\"id\":1,\"args\":[\"build\", \"foo\"]}' | {{prog}}\n  {\"type\":\"log\",\"id\":1,level\":\"i\",\"message\":\"building package foo\"}\n  ...\n  {\"type\":\"result\",\"id\":1,\"error\":\"no source files found in package \"foo\"\"}\n\n",
  options: {
    pid: "<pid> Parent process identifier" },
  main: _asyncToGenerator(function* (opts, args, usage, cb) {
    var sendResult = function (err, id) {
      var r = { type: "result" };
      if (id !== undefined) {
        r.id = id;
      }
      if (err) {
        r.error = err.description || (err.stack ? err.stack.split(/\n+/)[0] : String(err));
        r.diagnostics = _cmd_remotectrl_js$SrcError.makeDiagnostics(err);
      }
      process.send(r);
      if (err) {
        console.error(err.stack || String(err));
      }
    };

    yield _cmd_remotectrl_js$RemoteControl(opts.pid, function (msg, cb) {
      if (msg.type === "runcmd") {
        var f = function (err) {
          sendResult(err, msg.id);
          cb();
        };
        Mainv(process.argv.slice(0, 2).concat(msg.args)).then(f)["catch"](f);
      } else {
        sendResult("unknown remote message \"" + msg.type + "\"");
        cb();
      }
    });

    console.log("remote control exited");
  }) };
"use strict";

var EnvCmd = {
  desc: "Prints Jo environment information",
  main: _asyncToGenerator(function* (opts, args, usage) {

    for (var k in Env) {
      if (k === k.toUpperCase()) {
        var v = typeof Env[k] === "string" ? Env[k] : Env.format(Env[k]);
        process.stdout.write(k + "=" + JSON.stringify(v) + "\n");
      }
    }
  }) };
"use strict";

var Mainv = _asyncToGenerator(function* (argv) {
  var _ParseOpt$prog = _jo_js$ParseOpt.prog(argv);

  var _ParseOpt$prog2 = _slicedToArray(_ParseOpt$prog, 2);

  var prog = _ParseOpt$prog2[0];
  var argvRest = _ParseOpt$prog2[1];

  var _ParseOpt = _jo_js$ParseOpt(options, argvRest, usage, prog);

  var _ParseOpt2 = _slicedToArray(_ParseOpt, 3);

  var opts = _ParseOpt2[0];
  var args = _ParseOpt2[1];
  var dieusage = _ParseOpt2[2];

  if (args.length === 0) {
    return dieusage("no command specified");
  }

  var cmdname = args[0];
  if (cmdname === "help") {
    if (args.length === 1 || args[1] && args[1][0] === "-") {
      return dieusage();
    }
    args = [cmdname = args[1], "-help"];
  }

  var cmd = Commands[cmdname];
  if (!cmd) {
    return dieusage(JSON.stringify(cmdname) + " is not a command");
  }

  var cmdusage = "{{prog}}" + (cmd.usage ? " " + cmd.usage : "\n");

  var _ParseOpt3 = _jo_js$ParseOpt(cmd.options || {}, args.slice(1), cmdusage, prog + " " + cmdname, options);

  var _ParseOpt32 = _slicedToArray(_ParseOpt3, 3);

  var cmdopts = _ParseOpt32[0];
  var cmdargs = _ParseOpt32[1];
  var cmddieusage = _ParseOpt32[2];
  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {

    for (var _iterator = _core.$for.getIterator(_core.Object.keys(opts)), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var k = _step.value;

      if (cmdopts[k] === undefined || cmdopts[k] === null) cmdopts[k] = opts[k];
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator["return"]) {
        _iterator["return"]();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }

  return yield cmd.main.call(cmd, cmdopts, cmdargs, cmddieusage);
});

var usage = "Jo builds JavaScript programs\n{{prog}} <command>\n\nCommands:\n{{commands}}\n\nTerminology:\n  <pkg>     Packages to build. Can either be a directory (if starting with \".\" or \"/\"),\n            or a <pkgref>, which in the latter case the package is built from JOPATH.\n            Defaults to the current working directory if none specified.\n\n  <pkgref>  Package name with optional \"@variant\" suffix. What the variant means depends on\n            the source type. For a git repository, the variant is a branch, tag or commit.\n\n";

var options = {};
var Commands = {
  build: BuildCmd,
  remotectrl: RemoteControlCmd,
  env: EnvCmd,
  help: { argdesc: "<cmd>", desc: "Show help for a command" }
};

function _jo_js$init() {
  var cmds = _core.Object.keys(Commands).map(function (name) {
    return [Commands[name].argdesc ? name + " " + Commands[name].argdesc : name, Commands[name]];
  });
  var cmdNameMaxLen = cmds.reduce(function (p, c) {
    return Math.max(p, c[0].length);
  }, 0);
  var commandsUsage = cmds.map(function (c) {
    return "  " + c[0] + "                                               ".substr(0, cmdNameMaxLen - c[0].length) + "  " + c[1].desc;
  }).join("\n");
  usage = usage.replace(/\{\{commands\}\}/g, commandsUsage);
}
_target_nodejs_js$init();
_target_browser_js$init();
_cmd_build_js$init();
_jo_js$init();
exports.BuildCtx = BuildCtx;
exports.BuildCmd = BuildCmd;
exports.EnvCmd = EnvCmd;
exports.RemoteControlCmd = RemoteControlCmd;
exports.CodeBuffer = CodeBuffer;
exports.ExportError = ExportError;
exports.ReferenceError = ReferenceError;
exports.CyclicReferenceError = CyclicReferenceError;
exports.PkgCompiler = PkgCompiler;
exports.Env = Env;
exports.Mainv = Mainv;
exports.Commands = Commands;
exports.Logger = Logger;
exports.Module = Module;
exports.PrecompiledModule = PrecompiledModule;
exports.Pkg = Pkg;
exports.BuiltInPkg = BuiltInPkg;
exports.NPMPkg = NPMPkg;
exports.TokenEditor = TokenEditor;
exports.Preprocessor = Preprocessor;
exports.SrcFile = SrcFile;
exports.TARGET_BROWSER = TARGET_BROWSER;
exports.TARGET_BROWSER_WEBKIT = TARGET_BROWSER_WEBKIT;
exports.TARGET_NODEJS = TARGET_NODEJS;
exports.TARGET_MODE_DEV = TARGET_MODE_DEV;
exports.TARGET_MODE_RELEASE = TARGET_MODE_RELEASE;
exports.Targets = Targets;
exports.TargetOptions = TargetOptions;
exports.GLOBAL_STD = GLOBAL_STD;
exports.GLOBAL_DEPRECATED = GLOBAL_DEPRECATED;
exports.GLOBAL_UNSAFE = GLOBAL_UNSAFE;
exports.GLOBAL_EXPERIMENTAL = GLOBAL_EXPERIMENTAL;
exports.Target = Target;
exports.BrowserTarget = BrowserTarget;
exports.NodeJSTarget = NodeJSTarget;
exports.Tokenizer = Tokenizer;
exports.WorkDir = WorkDir;
//#sourceMappingURL=index.js.map
