// .bashrc: export PATH=$PATH:${JOPATH//://bin:}/bin
import path from 'path'
import fs from 'asyncfs'
import {repr} from './util'

var _JOPATH, _paths;

var Env = Object.create(null, {
  JOPATH: {
    enumerable: true,
    get:( ) => _JOPATH || (_JOPATH = process.env.JOPATH ? Env.parse(process.env.JOPATH) : []),
    set:(v) => { _JOPATH = v; process.env.JOPATH = Env.format(v); _paths = null; },
  },

  JOROOT: {
    enumerable: true,
    value: process.env.JOROOT || (process.env.JOROOT = path.dirname(__dirname))
  },

  // string[] -- list of search paths, in order.
  paths: {
    enumerable: true,
    get:() => _paths || (_paths = [Env.JOROOT].concat(Env.JOPATH))
  },

  // Format a list into a string. E.g. Env.format(["foo", "bar"]) -> "foo:bar"
  format: {value:(v) => v.join(':')},

  // Parse a string into a list. E.g. Env.parse("foo ::bar:") -> ["foo", "bar"]
  parse: {value:(s) => s.split(':').map(v => v.trim()).filter(v => v)},


  // Like asyncfs.open, but JOROOT and JOPATH-aware.
  // async open(filename:string, flags:int[, mode]):[fd:int, pkgdir:string, jopath:string]
  open: {value:(filename, flags, mode) =>
    fsTryDirs1(filename, null, (path, cb) =>
      fs.openAsync(path, flags, mode, cb)) },

  // Like asyncfs.readdir, but JOROOT and JOPATH-aware.
  // async readdir(dirname:string, basedirSuffix:string=null)
  //              :[ents:string[], pkgdir:string, jopath:string]
  readdir: {value:(dirname, basedirSuffix) =>
    fsTryDirs1(dirname, basedirSuffix, fs.readdirAsync) },

})


// async fsTryDirs1():[result:any, pkgdir:string, jopath:string]
function fsTryDirs1(filename, basedirSuffix, fn) { return new Promise((resolve, reject) => {
  var paths = Env.paths;
  var dirs = basedirSuffix ? paths.map(s => s + '/' + basedirSuffix).concat(Env.JOPATH) : paths;
  var next = function(index) {
    var basedir = dirs[index];
    var jopath = paths[index++];
    var pkgdir = basedir + '/' + filename;
    fn(pkgdir, (err, ret) => {
      if (err && err.code === 'ENOENT') {
        if (index === dirs.length) {
          err = new Error(
            repr(filename)+
            ' not found in '+(dirs.length > 1 ? 'any of ' : '')+
            dirs.map(repr).join(', ')
          )
          err.code = 'ENOENT'
          err.errno = 34
          err.path = filename
        } else {
          return next(index);
        }
      }
      if (err) {
        reject(err);
      } else {
        resolve([ret, pkgdir, jopath]);
      }
    })
  };
  next(0);
})}
