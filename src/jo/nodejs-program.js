import 'assert'
import 'path'
import fs from 'asyncfs'
import babel from 'npmjs.com/babel-core'

function lastPathComponent(name) {
  var v = name.split('/'), i = v.length, s;
  while ((s = v[--i])) {
    if (s !== '') return s;
  }
  throw new Error('empty pathname');
}


// Module import functions
// __$i(moduleAPI:Object) -- "import x from <moduleAPI>"
// __$iw(moduleAPI:Object) -- "import * as x from <moduleAPI>"
// __$im(pkgRef:string) -- "import x" a package module by ref
// __$imw(pkgRef:string) -- "import *" a package module by ref

const staticallyLinkedModuleCode =
`  , __$gm = function(q, r, w) {
      var f, m = __$m[r];
      if (m === undefined) {
        throw new Error('unknown package module "'+r+'"');
      }
      if (!m.exports) {
        f = m;
        __$m[r] = m = {exports:{}, id:r};
        f(q, m, m.exports);
      }
      return m.exports;
    }
  , __$i = function(m){ return m && m.__esModule ? (m["default"] || m) : m; }
  , __$iw = function(m){ return m && m.__esModule ? m : {"default":m}; }
  , __$im = function(q,r){ return __$i(__$gm(q,r)); }
  , __$imw = function(q,r){ return __$iw(__$gm(q,r)); }`;


const dynamicModuleCode =
`  , __$dlm = function(q, ref){
      for(var i = 0, L = __$JOPATH.length; i !== L; ++i){
        try {
          return q(__$JOPATH[i] + ref + "/index.js");
        } catch (e) {
          if (i === L-1) throw e;
        }
      }
    }
  , __$i = global.__$i = function(m){ return m && m.__esModule ? (m["default"] || m) : m; }
  , __$iw = global.__$iw = function(m){ return m && m.__esModule ? m : {"default":m}; }
  , __$im = global.__$im = function(q,r){ return __$i(__$dlm(q,r)); }
  , __$imw = global.__$imw = function(q,r){ return __$iw(__$dlm(q,r)); }`;



// Aids in generating programs for NodeJS (used by NodeJSTarget)
class NodeJSProgram {
  constructor(pkg:Pkg, module:Module, srcfiles:SrcFile[], target:Targer) {
    this.pkg      = pkg
    this.module   = module
    this.srcfiles = srcfiles
    this.target   = target

    // this.filename = Where should the final program be written?
    if (this.target.options.output) {
      // E.g. "lol" when -o=lol is provided to a build command
      // E.g. effectively process.stdout when -o=- is provided to a build command
      this.filename = this.target.options.output;
    } else {
      this.filename = this.filenameDir() + '/' + this.programName();
    }
  }


  filenameDir() {
    if (this.pkg.jopath) {
      // E.g. ref:"foo/bar" => "JOPATH/bin/bar"
      return this.pkg.jopath + '/bin';
    } else {
      // E.g. dir:"/jo/foo/bar" => "./bar"
      return '.';
    }
  }


  programName() {
    // E.g. "foo/bar" => "bar"
    // E.g. "foo/bar" => "bar-g" (in -dev mode)
    return lastPathComponent(this.pkg.ref || this.pkg.dir) + (this.target.isDevMode ? '-g' : '');
  }

  execProgramName() {
    return 'iojs'; // 'node'
  }

  shebang() {
    let args = ' --harmony --es_staging';
    if (this.target.isDevMode) {
      args += ' --stack-trace-limit=25';
    }
    return '#!/usr/bin/env ' + this.execProgramName() + args + '\n';
  }


  JOROOTCode() {
    let code;
    let dstDirAbs = path.dirname(path.resolve(this.filename));
    let configurable = true; // todo: make into option

    if (dstDirAbs.startsWith(Env.JOROOT)) {
      if (this.pkg.ref === 'jo/jo') {
        // Note: When building ourselves (local "jo/jo") don't care about env.JOROOT.
        // This allows one jo program to build another jo program, for instance:
        //   JOROOT=/dev-jo /stable-jo/bin/jo build jo/jo
        //   /dev-jo/bin/jo
        // As "dev-jo" might contain pkgs which are incompatible with /stable-jo/bin/jo,
        // we must ensure that stable-jo loads its packages from /stable-jo/pkg rather
        // than JOROOT/pkg.
        configurable = false;
      }
      let relpath = path.relative(dstDirAbs, Env.JOROOT);
      if (relpath === '..') {
        code = 'require("path").dirname(__dirname)';
      } else {
        code = 'require("path").resolve(__dirname+' +
          JSON.stringify(relpath).replace(/^"/, '"/') + ')';
      }
    } else {
      code = JSON.stringify(Env.JOROOT);
    }

    if (configurable) {
      code = 'process.env.JOROOT||' + code;
    }

    return code;
  }


  async getNPMROOT() {
    let basedir = this.pkg.jopath || this.pkg.dir;
    let dstDir = path.dirname(path.resolve(this.filename));
    let relpath = path.relative(dstDir, basedir);
    if (relpath === '..') {
      return 'require("path").dirname(__dirname)+"/node_modules/"';
    } else {
      return 'require("path").resolve(__dirname+' +
             JSON.stringify('/'+relpath+'/node_modules') + '+"/")';
    }
  }


  addEntryCode(codebuf:CodeBuffer2) {
    codebuf.append('main(process.argv);\n');
  }


  resolveDependencies() {
    // console.log('resolveDependencies: pkg.deps:', repr(this.pkg.deps,1));
    let babelHelpers = null;
    let joHelpers = null;
    let deps = {};

    let addHelpers = module => {
      if (!(module instanceof PrecompiledModule)) {
        // Note: we skip precompiled modules for now, as they don't have .info
        if (__DEV__) { assert(module.info) }
        if (module.info.rt) {
          module.info.rt.forEach(ref => {
            if (ref.startsWith('jo.')) {
              if (!joHelpers) { joHelpers = new Set; }
              joHelpers.add(this.target.joHelper(ref.substr(3)));
            } else {
              if (!babelHelpers) { babelHelpers = {}; }
              babelHelpers[ref] = true;
            }
          });
        }
      }
    }

    let visit = (pkg, depth) => {
      let dep = deps[pkg.id];
      if (dep) {
        dep.score += depth;
      } else {
        deps[pkg.id] = dep = {pkg: pkg, score: depth};
        if (!(module instanceof PrecompiledModule) && !(pkg instanceof NPMPkg)) {
          if (!pkg.module) { console.log('visit:', pkg); }
          if (__DEV__) { assert(pkg.module) }
          addHelpers(pkg.module);
        }
      }
      visitDeps(pkg, depth+1);
    }

    let visitDeps = (pkg, depth) => {
      pkg.deps.forEach(pkg => {
        if (!(pkg instanceof BuiltInPkg)) {
          visit(pkg, depth);
        }
      });
    }

    addHelpers(this.pkg.module);
    if (this.module !== this.pkg.module) {
      // for test modules
      addHelpers(this.module);
    }
    visitDeps(this.pkg, 1);

    deps = Object.keys(deps).map(k => deps[k])
    // Sort from highest score (most dependants) to least score. When score is the same, meaning
    // there's no difference in "import cardinality", the packages are sorted on id to minimize
    // movement in generate code for e.g. diffing.
    deps.sort((a, b) => b.score === a.score ? (b.pkg.id < a.pkg.id ? -1 : 1)
                                            : b.score - a.score);

    // Make sure the module this program represents isn't part of deps
    if (!(this.module instanceof TestModule)) {
      deps = deps.filter(d => {
        if (d.pkg.module === this.module) {
          if (__DEV__) { assert(d.score === 1) }
          return false;
        } else {
          return true;
        }
      });
    }

    return {
      babelHelpers: babelHelpers ? Object.keys(babelHelpers) : null,
      joHelpers: joHelpers,
      pkgs: deps.map(dep => dep.pkg), // {pkg:Pkg, score:int}[] -> Pkg[]
    };
  }


  addModuleCode(module:Module, codebuf:CodeBuffer2) {
    let code = module.code.replace(/\n\/\/#sourceMappingURL=.+\n/gm, '\n\n');
    if (module.map) {
      codebuf.appendMapped(code, module.map);
    } else {
      codebuf.append(code);
    }
  }


  addHeaderCode(codebuf:CodeBuffer2) {}


  async write() {
    // console.log('NodeJSProgram:write', repr(this,0))

    // Resolve all helpers and packages needed by this program
    let deps = this.resolveDependencies();

    let codebuf = new CodeBuffer2();
    let staticLinking = this.target.options.staticLinking;

    // Add shebang and "use strict"
    codebuf.append(this.shebang() + '"use strict";\n');

    // JO_PROGRAM_START_TIME
    if (this.target.isDevMode) {
      codebuf.append('process.env.JO_PROGRAM_START_TIME = Date.now();\n');
    }

    // JOROOT
    codebuf.append('var _$JOROOT=' + this.JOROOTCode() + ',' +
                       '_$NPMROOT=' + (await this.getNPMROOT()) + ';\n');

    // Add sourcemap support to nodejs
    codebuf.append('try{require(_$NPMROOT+"source-map-support/source-map-support.js")'+
                   '.install();}catch(_){}\n');

    // Add core-js
    let corejsRef = 'babel-core/node_modules/core-js/client';
    if (staticLinking) {
      // TODO: Add only what's needed
      let corejsPath = Env.JOROOT + '/node_modules/' + corejsRef;
      let [corejsCode, corejsMap] = await Promise.all([
        fs.readFile(corejsPath + '/core.min.js', {encoding:'utf8'}),
        fs.readFile(corejsPath + '/core.min.js.map', {encoding:'utf8'}),
      ]);
      corejsCode = corejsCode.replace(/\n\/\/#[ \s]*sourceMappingURL=.+\n?/gm, '\n');
      corejsMap = JSON.parse(corejsMap);
      codebuf.appendMapped(corejsCode, corejsMap);
    } else {
      codebuf.append('require(_$NPMROOT+' + JSON.stringify(corejsRef + '/core.js') + ');\n');
    }

    // Add module support
    if (staticLinking) {
      codebuf.append('var __$m = {}\n') // embedded module registry
    } else {
      let pkgDirName = '/pkg/'+this.target.pkgDirName+'/';
      codebuf.append(
        'var __$JOPATH = Array.prototype.concat.apply([' +
          '_$JOROOT+' + JSON.stringify(pkgDirName) +
          ',__dirname+'+JSON.stringify("/.." + pkgDirName) +
        '],process.env.JOPATH ? process.env.JOPATH.split(":") : [])\n'
      );
    }

    // Add import functions
    if (staticLinking) {
      codebuf.append(staticallyLinkedModuleCode + ';\n');
    } else {
      codebuf.append(dynamicModuleCode + ';\n');
    }

    // Add helpers code
    // if (deps.babelHelpers.length)

    // Add helpers code
    if (deps.babelHelpers) {
      let helpersCode = babel.buildExternalHelpers(deps.babelHelpers, 'var') + '\n';
      helpersCode = helpersCode.replace(/babelHelpers(\.|\[| \=)/g, '_$rt$1');
      // FIXME: babelHelpers should be renamed in a less fragile fashion
      helpersCode = helpersCode.replace('var _$rt =', 'var _$rt = global._$rt =');
      codebuf.append(helpersCode);
    } else if (deps.joHelpers) {
      codebuf.append('var _$rt = global._$rt = {};\n');
    }
    if (deps.joHelpers) {
      this.target.genJoHelpers(deps.joHelpers, codebuf);
    }

    // Add some program-type specific header code (see NodeJSTestProgram for example)
    this.addHeaderCode(codebuf);

    // Add deps' module code
    if (staticLinking) {
      await Promise.all(deps.pkgs.map(pkg => pkg.module.load()));
      deps.pkgs.forEach(pkg => {
        if (pkg.module && pkg.module.code) {
          codebuf.append('__$m["' + pkg.ref + '"] = function(require,module,exports){\n');
          this.addModuleCode(pkg.module, codebuf);
          codebuf.append('\n};\n');
        }
      })
    }

    // Add "basedOn" module code.
    // TODO: move into NodeJSTestProgram
    if (this.module !== this.pkg.module) {
      if (__DEV__) {
        assert(this.module !== this.pkg.module);
        assert(this.pkg.module.code !== null);
      }
      this.addModuleCode(this.pkg.module, codebuf);
    }

    // Add this module's code
    this.addModuleCode(this.module, codebuf);

    // Add entry code
    this.addEntryCode(codebuf);

    // Write (log message)
    if (this.target.log.level >= Logger.DEBUG) {
      let style = this.target.log.style;
      let dst = '';
      if (this.filename === '-') {
        dst = 'to stdout';
      } else {
        dst = style.boldMagenta(this.filename);
      }
      this.target.log.debug('write program', dst, 'of package', style.boldGreen(this.pkg.id));
    }

    // Write
    // console.log(codebuf.code);
    await writeCode({
      code:      codebuf.code,
      map:       codebuf.sourceMapAsJSON(),
      stream:    this.filename === '-' ? process.stdout : null,
      filename:  this.filename === '-' ? null : this.filename,
      filemode:  511, // 0777
      inlineMap: true,
    });

    // Usually needed (when overwriting a file)
    // await fs.chmod(programDstFile, 511);
  }

}
