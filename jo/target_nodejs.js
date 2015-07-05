var path = require('path');

class NodeJSTarget extends Target {
  constructor(id, mode, options) {
    super(id, mode, options);
    this.registerGlobals([
      'Buffer', 'clearImmediate', 'clearInterval', 'clearTimeout',
      'console', 'exports', 'global', 'module', 'process',
      'require', 'setImmediate', 'setInterval', 'setTimeout',
      '__dirname', '__filename'
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
    var isMain = depLevel === 0 && pkg.hasMainFunc;

    // Requires explicit NODE_PATH for modules provided by jo?
    var runtimeModules = this.resolveRequiredRuntimeModules(pkg);
    var externalModulePaths = [];
    if (runtimeModules.length !== 0 || isMain /* requires source-map-support */) {
      externalModulePaths.push(
        '(process.env.JOROOT || ' + JSON.stringify(Env.JOROOT) + ') + "/jo/node_modules"'
      );
    }

    // TODO: Add other packages
    // JOROOT/pkg/nodejs.release

    let header = '';

    if (isMain) {
      // #!node
      let nodeArgs = ' --harmony';
      if (this.isDevMode) {
        nodeArgs += ' --stack-trace-limit=25';
      }
      header += '#!/usr/bin/env node' + nodeArgs + '\n';
    }

    if (externalModulePaths.length !== 0) {
      let s = '[0,0,' + externalModulePaths.join(',') + ']';
      header += 'Array.prototype.splice.apply(module.paths,' + s + ');\n';
    }

    if (isMain) {
      header += "require('source-map-support').install();\n";
    }

    return header;
  }


  pkgModuleFooter(pkg:Pkg, depLevel:int) {
    return pkg.hasMainFunc ? 'main();' : null;
  }


  postCompile(pkg:Pkg, depLevel:int) {
    if (!pkg.jopath && depLevel === 0) {
      pkg.module.map.inline = true;
    }
  }


  async postMake(pkgs:Pkg[]) {
    var pkg = pkgs[0];

    if (pkg.jopath) {
      // Not a program
      return;
    }

    var outfile = this.options.output;
    var fileMode = 511; // 0777

    // Program destination
    if (this.options.output) {
      outfile = this.options.output;
    } else {
      if (pkg.ref) {
        outfile = './' + pkg.ref;
      } else {
        outfile = './' + path.resolve(pkg.dir).split('/').pop();
      }
      if (!pkg.hasMainFunc) {
        fileMode = 438; // 0666
      }
    }

    let writeToStdout = this.options.output && outfile === '-';

    await writeCode(pkg.module.code, pkg.module.map, outfile, writeToStdout);
    if (!writeToStdout) {
      await fs.chmod(outfile, fileMode);
    }
  }

}
