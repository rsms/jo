import fs from 'asyncfs'
import path from 'path'
import {ok as assert} from 'assert'
import {G} from 'jo/util'

// interface Module {
//   filename?string
//   stat?:fs.Stat
//   code?:string
//   map?:SourceMap
// }

class Module {
  constructor({filename=null, stat=null, code=null, map=null}) {
    this.filename = filename;
    this.stat = stat;
    this.code = code;
    this.map = map;
    this.program  = null;
    this.info = null;
    this.joHelpers = null; // Set<string> of helper names, when helpers are used
    this.exports = new Map;
  }


  async loadStat() {
    if (!this.stat) {
      this.stat = await fs.stat(this.filename)
    }
    return this.stat;
  }


  async load() {
    var m = this
    await this.loadStat();
    if (m.stat && !m.code) {
      m.code = await fs.readFile(m.filename, {encoding:'utf8'})
      if (!m.info) {
        m.info = Module.parseInfo(m.code);
      }
    }
    if (!m.map && m.code) {
      m.map = await Module.loadSourceMap(m.code, m.filename);
    }
  }


  static async loadSourceMap(code:string, filename?:string) {
    // //#sourceMappingURL=data:application/json;charset:utf-8;base64,
    let prefix = '//#sourceMappingURL=';
    let p = code.lastIndexOf(prefix);
    if (p === -1) {
      return null;
    }

    let dataURLPrefix = 'data:application/json;charset:utf-8;base64,';
    p += prefix.length;
    let url = code.substring(p, code.indexOf('\n', p));

    let scheme = '';
    let x = url.indexOf(':');
    if (x !== -1) {
      scheme = url.substr(0, x).toLowerCase();
    }

    let mapContent;
    if (scheme === 'data') {
      let y = url.indexOf(',');
      // assert(y !== -1);
      mapContent = new Buffer(url.substr(y+1), 'base64').toString('utf8');
    } else if (scheme === '' || scheme === 'file') {
      let mapFilename = (scheme === 'file') ? url.substr(5) : url;
      if (mapFilename[0] !== '/') {
        if (filename && filename[0] === '/') {
          mapFilename = path.resolve(filename+'/..', mapFilename);
        } else {
          // relative filename without a base
          return null;
        }
      }
      mapContent = await fs.readFile(mapFilename, {encoding:'utf8'});
    } else {
      throw new Error('unable to featch data for source map url "'+url+'"');
    }

    return JSON.parse(mapContent);
  }


  async write(mode:int=438/*0666*/) {
    writeCode({
      code:     this.code,
      map:      this.map,
      stream:   this.filename === '-' ? process.stdout : null,
      filename: this.filename === '-' ? null : this.filename,
      filemode: mode,
    })
  }


  get hasMainFunc() {
    return !!(this.mainFunc || (this.info && this.info.main));
  }


  registerJoHelper(name:string) {
    if (!this.joHelpers) { this.joHelpers = new Set; }
    this.joHelpers.add(name);
  }


  // Parses an info line from `code`
  static parseInfo(code:string) {//:PkgInfo
    // find '//#jopkg{"imports":["./bar","react"]}'
    const jopkgStmtPrefix = '//#jopkg'
    var end, begin = code.indexOf(jopkgStmtPrefix);
    if (begin !== -1) {
      begin += jopkgStmtPrefix.length;
      end = code.indexOf('\n', begin);
    }
    if (begin === -1 || end === -1) {
      return null;
    }
    return JSON.parse(code.substring(begin, end))
  }


  exportedNames() { //:Generator<string>
    return this.exports.keys();
  }


  helperNames(srcfiles:SrcFile[]) {
    var rt = {};
    srcfiles.forEach(f => {
      f.parsed.metadata.usedHelpers.forEach(ref => { rt[ref] = true })
    });
    if (this.joHelpers) {
      this.joHelpers.forEach(ref => { rt['jo.' + ref] = true })
    }
    return Object.keys(rt).sort();
  }


  makeInfo(srcfiles:SrcFile[], importRefs) {
    return {
      files:   srcfiles.map(f => f.name),
      rt:      this.helperNames(srcfiles),
      imports: Object.keys(importRefs).sort(),
      exports: G.list(this.exportedNames()),
      implv:   Date.now().toString(36), // FIXME: code content hash?
      apiv:    Date.now().toString(36), // FIXME: API hash?
      main:    this.hasMainFunc,
    };
  }

}
Module.prototype.typeName = 'module';


class TestModule extends Module {
  constructor() {
    super({})
  }

  exportedNames() {
    return [];
  }
}
TestModule.prototype.typeName = 'test module';


class NPMModule extends Module {
  constructor(filename:string) {
    super({filename})
  }

  async load() {
    this.loadStat();
    console.log('TODO NPMModule.load()');
  }
}
NPMModule.prototype.typeName = 'npm module';


class PrecompiledModule extends Module {
  constructor(filename) {
    super({filename})
  }

  async copyToIfOutdated(dstFilename, pkg:Pkg, target:Target) {
    if (__DEV__) { assert(!!this.filename) }
    var dstStat;
    [dstStat, this.stat] = await Promise.all([dstFilename, this.filename].map(f => fs.stat(f)));
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
          await fs.readFile(this.filename, {encoding:'utf8'})
        );
        await fs.writeFile(dstFilename, code, {encoding:'utf8'});
      })();
    } else {
      copyPromise = fs.copy(this.filename, dstFilename);
    }

    var copyMap = async () => {
      if (await fs.stat(this.filename + '.map')) {
        await fs.copy(this.filename + '.map', dstFilename + '.map');
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
PrecompiledModule.prototype.typeName = 'precompiled module';
