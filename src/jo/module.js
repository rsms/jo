import fs from 'asyncfs'
import path from 'path'

// interface Module {
//   file?string
//   stat?:fs.Stat
//   code?:string
//   map?:SourceMap
// }

class Module {
  constructor({file=null, stat=null, code=null, map=null}) {
    this.file = file ? file : null;
    this.stat = stat;
    this.code = code;
    this.map = map;
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
        // Ignore non-existent source maps
        if (err.code !== 'ENOENT') {
          throw err;
        }
      }
    }
  }

}


class PrecompiledModule extends Module {
  constructor(file) {
    super({file:file})
  }

  async copyToIfOutdated(dstFilename, pkg:Pkg, target:Target) {
    var dstStat;
    [dstStat, this.stat] = await Promise.all([dstFilename, this.file].map(f => fs.stat(f)));
    if (dstStat && this.stat.mtime <= dstStat.mtime) {
      // up-to-date
      return;
    }

    await fs.mkdirs(path.dirname(dstFilename));

    var copyPromise;
    if (target.filterPrecompiledModuleCode) {
      copyPromise = (async () => {
        let code = target.filterPrecompiledModuleCode(
          pkg,
          await fs.readFile(this.file, {encoding:'utf8'})
        );
        await fs.writeFile(dstFilename, code, {encoding:'utf8'});
      })();
    } else {
      copyPromise = fs.copy(this.file, dstFilename);
    }

    var copyMap = async () => {
      if (await fs.stat(this.file + '.map')) {
        await fs.copy(this.file + '.map', dstFilename + '.map');
      }
    };

    await Promise.all([
      copyPromise,
      copyMap()
    ]);
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

