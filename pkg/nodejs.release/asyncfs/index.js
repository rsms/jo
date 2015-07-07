//#jopkg{"files":["asyncfs.js"],"imports":["fs"],"exports":["default"],"babel-runtime":["core-js"],"version":"ibtld6i2"}
var _core = __$irt("babel-runtime/core-js")
  , _asyncfs_js$fs = __$i(require("fs"));
"use strict";

var slice = Array.prototype.slice;

function wrap1_ignoreENOENT(fn) {
  return function () {
    var args = slice.call(arguments);
    return new _core.Promise(function (resolve, reject) {
      args.push(function (err, arg1) {
        if (err) {
          if (err.code === "ENOENT") {
            resolve(null);
          } else {
            reject(err);
          }
        } else {
          resolve(arg1);
        }
      });
      fn.apply(_asyncfs_js$fs, args);
    });
  };
}

function wrap1(fn) {
  return function () {
    var args = Array.prototype.slice.call(arguments);
    return new _core.Promise(function (resolve, reject) {
      args.push(function (err, arg1) {
        if (err) reject(err);else resolve(arg1);
      });
      fn.apply(_asyncfs_js$fs, args);
    });
  };
}

function wrap2(fn) {
  return function () {
    var args = Array.prototype.slice.call(arguments);
    return new _core.Promise(function (resolve, reject) {
      args.push(function (err, arg1, arg2) {
        if (err) reject(err);else resolve([arg1, arg2]);
      });
      fn.apply(_asyncfs_js$fs, args);
    });
  };
}

function wrap1_err2bool(fn) {
  return function () {
    var args = Array.prototype.slice.call(arguments);
    return new _core.Promise(function (resolve, reject) {
      args.push(function (err) {
        resolve(!err);
      });
      fn.apply(_asyncfs_js$fs, args);
    });
  };
}

function mkdirs(path) {
  return new _core.Promise(function (resolve, reject) {
    _mkdirs(path, function (err) {
      if (err) reject(err);else resolve();
    });
  });
}

function _mkdirs(path, cb) {
  _asyncfs_js$fs.mkdir(path, function (err) {
    if (!err || err.code === "EEXIST") {
      return cb();
    } else if (err.code === "ENOENT") {
      path = require("path").resolve(path);
      var p = path.lastIndexOf("/");
      if (p === -1) {
        cb(err);
      } else {
        _mkdirs(path.substr(0, p), function (err) {
          if (err) {
            cb(err);
          } else {
            _asyncfs_js$fs.mkdir(path, function (err) {
              cb(!err || err.code === "EEXIST" ? null : err);
            });
          }
        });
      }
    } else {
      cb(err);
    }
  });
}

function copy(srcpath, dstpath) {
  return new _core.Promise(function (resolve, reject) {
    var completed = false,
        cb = function cb(err) {
      if (!completed) {
        completed = true;
        if (err) reject(err);else resolve();
      }
    };
    var r = _asyncfs_js$fs.createReadStream(srcpath),
        w = _asyncfs_js$fs.createWriteStream(dstpath);
    r.once("error", cb);
    w.once("error", cb);
    w.once("close", cb);
    r.pipe(w);
  });
}
exports.__esModule = true;
exports["default"] = {rename:wrap1(_asyncfs_js$fs.rename), ftruncate:wrap1(_asyncfs_js$fs.ftruncate), truncate:wrap1(_asyncfs_js$fs.truncate), chown:wrap1(_asyncfs_js$fs.chown), fchown:wrap1(_asyncfs_js$fs.fchown), lchown:wrap1(_asyncfs_js$fs.lchown), chmod:wrap1(_asyncfs_js$fs.chmod), fchmod:wrap1(_asyncfs_js$fs.fchmod), lchmod:wrap1(_asyncfs_js$fs.lchmod), stat:wrap1_ignoreENOENT(_asyncfs_js$fs.stat), lstat:wrap1_ignoreENOENT(_asyncfs_js$fs.lstat), fstat:wrap1_ignoreENOENT(_asyncfs_js$fs.fstat), link:wrap1(_asyncfs_js$fs.link), symlink:wrap1(_asyncfs_js$fs.symlink), readlink:wrap1(_asyncfs_js$fs.readlink), realpath:wrap1(_asyncfs_js$fs.realpath), unlink:wrap1(_asyncfs_js$fs.unlink), rmdir:wrap1(_asyncfs_js$fs.rmdir), mkdir:wrap1(_asyncfs_js$fs.mkdir), mkdirs:mkdirs, readdir:wrap1(_asyncfs_js$fs.readdir), close:wrap1(_asyncfs_js$fs.close), open:wrap1(_asyncfs_js$fs.open), utimes:wrap1(_asyncfs_js$fs.utimes), futimes:wrap1(_asyncfs_js$fs.futimes), fsync:wrap1(_asyncfs_js$fs.fsync), write:wrap2(_asyncfs_js$fs.write), read:wrap2(_asyncfs_js$fs.read), readFile:wrap1(_asyncfs_js$fs.readFile), writeFile:wrap1(_asyncfs_js$fs.writeFile), appendFile:wrap1(_asyncfs_js$fs.appendFile), access:wrap1_err2bool(_asyncfs_js$fs.access), copy:copy, watchFile:_asyncfs_js$fs.watchFile, unwatchFile:_asyncfs_js$fs.unwatchFile, createReadStream:_asyncfs_js$fs.createReadStream, createWriteStream:_asyncfs_js$fs.createWriteStream, Stats:_asyncfs_js$fs.Stats, ReadStream:_asyncfs_js$fs.ReadStream, WriteStream:_asyncfs_js$fs.WriteStream, FSWatcher:_asyncfs_js$fs.FSWatcher, renameAsync:_asyncfs_js$fs.rename, ftruncateAsync:_asyncfs_js$fs.ftruncate, truncateAsync:_asyncfs_js$fs.truncate, chownAsync:_asyncfs_js$fs.chown, fchownAsync:_asyncfs_js$fs.fchown, lchownAsync:_asyncfs_js$fs.lchown, chmodAsync:_asyncfs_js$fs.chmod, fchmodAsync:_asyncfs_js$fs.fchmod, lchmodAsync:_asyncfs_js$fs.lchmod, statAsync:_asyncfs_js$fs.stat, lstatAsync:_asyncfs_js$fs.lstat, fstatAsync:_asyncfs_js$fs.fstat, linkAsync:_asyncfs_js$fs.link, symlinkAsync:_asyncfs_js$fs.symlink, readlinkAsync:_asyncfs_js$fs.readlink, realpathAsync:_asyncfs_js$fs.realpath, unlinkAsync:_asyncfs_js$fs.unlink, rmdirAsync:_asyncfs_js$fs.rmdir, mkdirAsync:_asyncfs_js$fs.mkdir, readdirAsync:_asyncfs_js$fs.readdir, closeAsync:_asyncfs_js$fs.close, openAsync:_asyncfs_js$fs.open, utimesAsync:_asyncfs_js$fs.utimes, futimesAsync:_asyncfs_js$fs.futimes, fsyncAsync:_asyncfs_js$fs.fsync, writeAsync:_asyncfs_js$fs.write, readAsync:_asyncfs_js$fs.read, readFileAsync:_asyncfs_js$fs.readFile, writeFileAsync:_asyncfs_js$fs.writeFile, appendFileAsync:_asyncfs_js$fs.appendFile, watchAsync:_asyncfs_js$fs.watch, existsAsync:_asyncfs_js$fs.exists, accessAsync:_asyncfs_js$fs.access, renameSync:_asyncfs_js$fs.renameSync, ftruncateSync:_asyncfs_js$fs.ftruncateSync, truncateSync:_asyncfs_js$fs.truncateSync, chownSync:_asyncfs_js$fs.chownSync, fchownSync:_asyncfs_js$fs.fchownSync, lchownSync:_asyncfs_js$fs.lchownSync, chmodSync:_asyncfs_js$fs.chmodSync, fchmodSync:_asyncfs_js$fs.fchmodSync, lchmodSync:_asyncfs_js$fs.lchmodSync, statSync:_asyncfs_js$fs.statSync, lstatSync:_asyncfs_js$fs.lstatSync, fstatSync:_asyncfs_js$fs.fstatSync, linkSync:_asyncfs_js$fs.linkSync, symlinkSync:_asyncfs_js$fs.symlinkSync, readlinkSync:_asyncfs_js$fs.readlinkSync, realpathSync:_asyncfs_js$fs.realpathSync, unlinkSync:_asyncfs_js$fs.unlinkSync, rmdirSync:_asyncfs_js$fs.rmdirSync, mkdirSync:_asyncfs_js$fs.mkdirSync, readdirSync:_asyncfs_js$fs.readdirSync, closeSync:_asyncfs_js$fs.closeSync, openSync:_asyncfs_js$fs.openSync, utimesSync:_asyncfs_js$fs.utimesSync, futimesSync:_asyncfs_js$fs.futimesSync, fsyncSync:_asyncfs_js$fs.fsyncSync, writeSync:_asyncfs_js$fs.writeSync, readSync:_asyncfs_js$fs.readSync, readFileSync:_asyncfs_js$fs.readFileSync, writeFileSync:_asyncfs_js$fs.writeFileSync, appendFileSync:_asyncfs_js$fs.appendFileSync, accessSync:_asyncfs_js$fs.accessSync};
//#sourceMappingURL=index.js.map
