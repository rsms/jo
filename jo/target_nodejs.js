
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
    if (this.options.output && depLevel === 0) {
      // Assume whatever set "output" made sure there's only one top-level
      // package. Now, return "output" for that top-level package `pkg`.
      return this.options.output;
    }
    return super.moduleFilename(pkg, depLevel);
  }

  transforms(transforms) {
    return super.transforms(transforms).concat([
      'asyncToGenerator',  // async/await. Requires Node.js >0.11.2
    ])
  }


  // (pkgs:Pkg[])
  // async postMake(pkgs) {
  // TODO: make program if there's a main function
  //   var mainFunc;
  //   for (let pkg of pkgs) {
  //     if (pkg.hasMainFunc) {
  //       console.log('mainFunc:', pkg.mainFunc);
  //     }
  //   }
  // }

}
