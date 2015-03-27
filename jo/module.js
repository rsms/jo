// interface Module {
//   file?string
//   stat?:fs.Stat
//   code?:string
//   map?:SourceMap
// }

class Module {
  constructor({file=null, stat=null, code=null, map=null}) {
    this.file = file
    this.stat = stat
    this.code = code
    this.map = map
  }


  async load() {
    var m = this
    if (!m.stat) {
      m.stat = await fs.stat(m.file)
    }
    if (!m.code) {
      m.code = await fs.readFile(m.file, {encoding:'utf8'})
    }
    if (!m.map) {
      try {
        m.map = JSON.parse(await fs.readFile(m.file + '.map', {encoding:'utf8'}))
      } catch (err) {
        // Ignore non-existent source maps for precompiled Modules
        if (!(m instanceof PrecompiledModule) || err.code !== 'ENOENT') {
          throw err
        }
      }
    }
  }

}


class PrecompiledModule extends Module {
  constructor(file) {
    super({file:file})
  }

  async copyToIfOutdated(dstFilename) {
    var dstStat
    // dstStat = await fs.stat(dstFilename)
    // this.stat = await fs.stat(this.file)
    [dstStat, this.stat] = await Promise.all([dstFilename, this.file].map(f => fs.stat(f)));
    if (!dstStat || this.stat.mtime > dstStat.mtime) {
      await fs.mkdirs(path.dirname(dstFilename))
      await fs.copy(this.file, dstFilename)
    }
  }


  // sourceFileForTarget(filenames:string[], target:Target):SrcFile
  static sourceFileForTarget(filenames, target) {
    if (target.mode === TARGET_MODE_DEV) {
      for (let f of filenames) {
        if (f === '__precompiled.dev.js') {
          return f;
        }
      }
    } else {
      for (let f of filenames) {
        if (f === '__precompiled.release.js' ||
            f === '__precompiled.js' ||
            f === '__precompiled.min.js')
        {
          return f;
        }
      }
    }
    return filenames[0]
  }

}

