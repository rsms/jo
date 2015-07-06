import fs from './asyncfs'
import path from 'path'

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


  moduleFilename(pkg:Pkg, depLevel:int) {
    if (!pkg.jopath) {
      if (depLevel === 0) {
        return null; // don't store or reuse intermediate code
      }
      if (this.localNodeModulesDir) {
        return this.localNodeModulesDir + '/' +
               (pkg.ref ? pkg.ref : path.resolve(pkg.dir).pop()) + '.js';
      }
    }
    return super.moduleFilename(pkg, depLevel);
  }

  transforms(transforms) {
    return super.transforms(transforms).concat([
      'asyncToGenerator',  // async/await. Requires Node.js >0.11.2
    ])
  }


  pkgModuleHeader(pkg:Pkg, depLevel:int) {
    var isMainProgram = depLevel === 0 && pkg.hasMainFunc;

    // Requires explicit NODE_PATH for modules provided by jo?
    var runtimeModules = this.resolveRequiredRuntimeModules(pkg);
    var externalModulePaths = [];

    // JOROOT to bake into source
    let bakedJOROOT;

    if (isMainProgram) {

      // Program destination
      if (this.options.output) {
        this.programDstFile = this.options.output;
      } else if (pkg.jopath) {
        let progname = pkg.ref.split('/').pop();
        this.programDstFile = pkg.jopath + '/bin/' + progname + (this.isDevMode ? '-g' : '');
      } else {
        if (pkg.ref) {
          this.programDstFile = './' + pkg.ref;
        } else {
          this.programDstFile = './' + path.resolve(pkg.dir).split('/').pop();
        }
      }

      // Attempt relative path for same joroot
      let dstDirAbs = path.dirname(path.resolve(this.programDstFile));
      if (dstDirAbs.indexOf(Env.JOROOT) === 0) {
        bakedJOROOT = '__dirname+' +
          JSON.stringify(path.relative(dstDirAbs, Env.JOROOT)).replace(/^"/, '"/');
      }
      // console.log('dstDirAbs:', dstDirAbs);
      // console.log('bakedJOROOT2:', path.relative(dstDirAbs, Env.JOROOT));
      // console.log('pkg.jopath', pkg.jopath)
      // console.log('pkg.dir   ', pkg.dir)
      // console.log('Env.JOROOT', Env.JOROOT)
    }

    if (!bakedJOROOT) {
      bakedJOROOT = JSON.stringify(Env.JOROOT);
    }


    let header = '';

    if (isMainProgram) {
      // #!node
      let nodeArgs = ' --harmony';
      if (this.isDevMode) {
        nodeArgs += ' --stack-trace-limit=25';
      }
      header += '#!/usr/bin/env node' + nodeArgs + '\n';

      // baked JOROOT
      header += 'var _$JOROOT=(process.env.JOROOT||require("path").' +
        (bakedJOROOT === '__dirname+"/.."' ? 'dirname(__dirname)' : 'resolve(' + bakedJOROOT + ')') +
      ');';

      // node_modules?
      if (runtimeModules.length !== 0 || isMainProgram /* requires source-map-support */) {
        externalModulePaths.push('_$JOROOT+"/pkg/npm"');
      }

      // Imports modules from jo/pkg?
      // Note: [dev] test for any non-relative import: .some(s => s[0] !== '.')
      if (pkg.pkgInfo.imports.length !== 0) {
        // e.g. JOROOT/pkg/nodejs.release
        externalModulePaths.push(
          '_$JOROOT+' + JSON.stringify(this.pkgDirName).replace(/^"/, '"/pkg/')
        );
      }

      if (externalModulePaths.length !== 0) {
        let s = '[0,0,' + externalModulePaths.join(',') + ']';
        header += 'Array.prototype.splice.apply(module.paths,' + s + ');\n';
      }

      header += "require('source-map-support').install();\n";
    }

    return header;
  }


  // pkgModuleFooter(pkg:Pkg, depLevel:int) {
  //   if (pkg.hasMainFunc) {
  //     if (depLevel > 0) {
  //       throw new Error('Attempting to build program "'+pkg.id+'" as module')
  //     }
  //     return 'main(process.argv);';
  //   }
  //   return null;
  // }


  // postCompile(pkg:Pkg, depLevel:int) {
  //   if (!pkg.jopath && depLevel === 0) {
  //     pkg.module.map.inline = true;
  //   }
  // }


  async postMake(pkgs:Pkg[]) {
    var pkg = pkgs[0];

    if (pkg.jopath && !pkg.hasMainFunc) {
      // Not a program
      return;
    }

    var fileMode = 511; // 0777
    if (!pkg.hasMainFunc) {
      fileMode = 438; // 0666
    }

    let writeToStdout = this.options.output && this.programDstFile === '-';

    // Add main function call
    let code = pkg.module.code;
    let p = code.lastIndexOf('\n//#sourceMappingURL=');
    let mainCall = 'main(process.argv);\n';
    if (p === -1) {
      code += mainCall;
    } else {
      code = code.substr(0, p+1) + mainCall + code.substr(p+1);
    }

    pkg.module.map.inline = true;

    // if (this.options.linkStatically) {
    //   ...
    // }

    await writeCode(code, pkg.module.map, this.programDstFile, writeToStdout);
    if (!writeToStdout) {
      await fs.chmod(this.programDstFile, fileMode);
    }
  }

}

function init() {
  Targets[TARGET_NODEJS] = NodeJSTarget;
}
