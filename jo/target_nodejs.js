
class NodeJSTarget extends Target {
  get moduleType() {
    return 'common'
  }

  get transforms() {
    return super.transforms.concat([
      'runtime', // indicate that generated code should use babel-runtime instead of inlines
      'asyncToGenerator',  // async/await. Requires Node.js >0.11.2
    ])
  }

  get disabledTransforms() {
    var t = super.disabledTransforms
    // Make sure "es6.modules" are not disabled, as we need it for "runtime"
    var i = t.indexOf('es6.modules')
    if (i !== -1) {
      t.splice(i,1)
    }
    return t
  }


  // (pkgs:Pkg[], log:Logger, output?:string)
  async make(pkgs, log, output=null) {
    var writemap = {}
    if (output) {
      if (pkgs.length > 1) {
        throw new Error('multiple packages can not be written to single output')
      }
      await this.makeModule(pkg, writemap, log, output)
    } else {
      await Promise.all(pkgs.map( (pkg) => this.makeModule(pkg, writemap, log) ))
    }
  }


  async makeModule(pkg, writemap, log, output=null) {
    if (pkg.dir in writemap) return;  // already done
    writemap[pkg.dir] = pkg

    var targetFile
    if (output) {
      targetFile = await pkg.resolveOutputFile(output)
    } else {
      let t = this.id + '-' + this.mode
      if (pkg.jopath && pkg.ref) {
        targetFile = pkg.jopath + '/pkg/' + t + '/' + pkg.ref + '/index.js'
      } else {
        targetFile = WorkDir.path + '/' +
          ( pkg.ref ? 'pkg/' + t + '/' + pkg.ref : 'pkgdir/' + t + pkg.dir ) + '.js'
      }
    }

    await Promise.all(
      [
        this.writeModuleIfOutdated(pkg, targetFile, log)
      ].concat(pkg.deps.map( (depPkg) => this.makeModule(depPkg, writemap, log) ))
    )
  }


  async writeModuleIfOutdated(pkg, targetFile, log) {
    if (pkg.module instanceof PrecompiledIRModule) {
      await pkg.module.copyToIfOutdated(targetFile)
    } else {
      if (pkg.module.stat && (await fs.stat(targetFile)).mtime >= pkg.module.stat.mtime) {
        // target is up-to-date
        log.debug('NodeJSTarget: up-to-date nodejs module', log.style.boldYellow(pkg.id))
        return null
      }
      log.info('making nodejs module', log.style.boldYellow(pkg.id))

      // Make sure IR module is loaded
      await pkg.module.load()

      // codegen & write
      log.debug('NodeJSTarget: codegen', log.style.boldGreen(pkg.id))
      let product = this.codegen(pkg.dir, pkg.module.code, pkg.module.map)

      // Prepend sourcemap support
      let code =
        "//# sourceMappingURL=index.js.map\n" +
        "require('source-map-support').install();\n" +
        product.code;
      log.debug('NodeJSTarget: write', log.style.boldMagenta(targetFile))
      await WriteCode(code, product.map, targetFile)
    }
  }


}
