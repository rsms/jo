
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

  moduleFilename(pkg:Pkg, depLevel:int) {
    // return null to indicate that the module should not be stored.
    if (depLevel === 0) {
      return this.programOutPath;
    }
    return super.moduleFilename(pkg, depLevel);
  }

  transforms(transforms) {
    return super.transforms(transforms).concat([
      'asyncToGenerator',  // async/await. Requires Node.js >0.11.2
    ])
  }


  async preMake(pkgs:Pkg[]) {
    var pkg = pkgs[0];

    // Program destination
    if (this.options.output) {
      this.programOutPath = this.options.output;
    } else if (pkg.ref) {
      this.programOutPath = './' + pkg.ref;
    } else {
      this.programOutPath = './' + path.resolve(pkg.dir).split('/').pop();
    }
  }


  pkgModuleHeader(pkg:Pkg) {
    if (!pkg.hasMainFunc) {
      return null;
    }

    // Requires explicit NODE_PATH for modules
    var runtimeModules = this.resolveRequiredRuntimeModules(pkg);
    var nodePath = '';
    if (runtimeModules.length !== 0 || this.isDevMode) {
      nodePath = ' NODE_PATH=' +
                 Env.JOROOT.replace(/([ :])/g, '\\$1') + '/jo/node_modules';
    }

    // Node.js program arguments
    let nodeArgs = ' --harmony';
    if (this.isDevMode) {
      nodeArgs += ' --stack-trace-limit=25';
    }

    // Wrap code as program and write (unless unmodified)
    let header = '#!/usr/bin/env' + nodePath + ' node' + nodeArgs + '\n';
    if (this.isDevMode) {
      header += "require('source-map-support').install();\n";
    }
    return header;
  }


  pkgModuleFooter(pkg:Pkg) {
    return pkg.hasMainFunc ? 'main();' : null;
  }


  postCompile(pkg:Pkg) {
    if (pkg.hasMainFunc) {
      if (this.isDevMode) {
        pkg.module.map.inline = true;
      } else {
        pkg.module.map.excluded = true;
      }
    }
  }

  async postMake(pkgs:Pkg[]) {
    if (pkgs[0].hasMainFunc) {
      let fileMode = 511; // 0777
      await fs.chmod(this.programOutPath, fileMode);
    }
  }

}
