import fs from 'fs'

export default {

// Async functions
rename: wrap1(fs.rename, 'rename'),
ftruncate: wrap1(fs.ftruncate, 'ftruncate'),
truncate: wrap1(fs.truncate, 'truncate'),
chown: wrap1(fs.chown, 'chown'),
fchown: wrap1(fs.fchown, 'fchown'),
lchown: wrap1(fs.lchown, 'lchown'),
chmod: wrap1(fs.chmod, 'chmod'),
fchmod: wrap1(fs.fchmod, 'fchmod'),
lchmod: wrap1(fs.lchmod, 'lchmod'),
stat: wrap1_ignoreENOENT(fs.stat),
lstat: wrap1_ignoreENOENT(fs.lstat),
fstat: wrap1_ignoreENOENT(fs.fstat),
link: wrap1(fs.link, 'link'),
symlink: wrap1(fs.symlink, 'symlink'),
readlink: wrap1(fs.readlink, 'readlink'),
realpath: wrap1(fs.realpath, 'realpath'),
unlink: wrap1(fs.unlink, 'unlink'),
rmdir: wrap1(fs.rmdir, 'rmdir'),
mkdir: wrap1(fs.mkdir, 'mkdir'),
mkdirs: mkdirs,
readdir: wrap1(fs.readdir, 'readdir'),
close: wrap1(fs.close, 'close'),
open: wrap1(fs.open, 'open'),
utimes: wrap1(fs.utimes, 'utimes'),
futimes: wrap1(fs.futimes, 'futimes'),
fsync: wrap1(fs.fsync, 'fsync'),
write: wrap2(fs.write, 'write'), // note: two different call signatures
read: wrap2(fs.read, 'read'),
readFile: wrap1(fs.readFile, 'readFile'),
writeFile: wrap1(fs.writeFile, 'writeFile'),
appendFile: wrap1(fs.appendFile, 'appendFile'),
access: wrap1_err2bool(fs.access),
copy: copy,

// Non-serializable functions
watchFile: fs.watchFile,
unwatchFile: fs.unwatchFile,
createReadStream: fs.createReadStream,
createWriteStream: fs.createWriteStream,

// Types
Stats: fs.Stats,
ReadStream: fs.ReadStream,
WriteStream: fs.WriteStream,
FSWatcher: fs.FSWatcher,

// Callback functions
renameAsync: fs.rename,
ftruncateAsync: fs.ftruncate,
truncateAsync: fs.truncate,
chownAsync: fs.chown,
fchownAsync: fs.fchown,
lchownAsync: fs.lchown,
chmodAsync: fs.chmod,
fchmodAsync: fs.fchmod,
lchmodAsync: fs.lchmod,
statAsync: fs.stat,
lstatAsync: fs.lstat,
fstatAsync: fs.fstat,
linkAsync: fs.link,
symlinkAsync: fs.symlink,
readlinkAsync: fs.readlink,
realpathAsync: fs.realpath,
unlinkAsync: fs.unlink,
rmdirAsync: fs.rmdir,
mkdirAsync: fs.mkdir,
readdirAsync: fs.readdir,
closeAsync: fs.close,
openAsync: fs.open,
utimesAsync: fs.utimes,
futimesAsync: fs.futimes,
fsyncAsync: fs.fsync,
writeAsync: fs.write,
readAsync: fs.read,
readFileAsync: fs.readFile,
writeFileAsync: fs.writeFile,
appendFileAsync: fs.appendFile,
watchAsync: fs.watch,
existsAsync: fs.exists,
accessAsync: fs.access,

// Export sync functions simply so we can use this module as a drop-in replacement for fs
renameSync: fs.renameSync,
ftruncateSync: fs.ftruncateSync,
truncateSync: fs.truncateSync,
chownSync: fs.chownSync,
fchownSync: fs.fchownSync,
lchownSync: fs.lchownSync,
chmodSync: fs.chmodSync,
fchmodSync: fs.fchmodSync,
lchmodSync: fs.lchmodSync,
statSync: fs.statSync,
lstatSync: fs.lstatSync,
fstatSync: fs.fstatSync,
linkSync: fs.linkSync,
symlinkSync: fs.symlinkSync,
readlinkSync: fs.readlinkSync,
realpathSync: fs.realpathSync,
unlinkSync: fs.unlinkSync,
rmdirSync: fs.rmdirSync,
mkdirSync: fs.mkdirSync,
readdirSync: fs.readdirSync,
closeSync: fs.closeSync,
openSync: fs.openSync,
utimesSync: fs.utimesSync,
futimesSync: fs.futimesSync,
fsyncSync: fs.fsyncSync,
writeSync: fs.writeSync,
readSync: fs.readSync,
readFileSync: fs.readFileSync,
writeFileSync: fs.writeFileSync,
appendFileSync: fs.appendFileSync,
accessSync: fs.accessSync,

};

let slice = Array.prototype.slice;

function wrap1_ignoreENOENT(fn) { return function() {
  let args = slice.call(arguments);
  return new Promise((resolve, reject) => {
    args.push(function(err, arg1) {
      if (err) {
        if (err.code === 'ENOENT') {
          resolve(null)
        } else {
          reject(err)
        }
      } else {
        resolve(arg1)
      }
    })
    fn.apply(fs, args)
  })
}}

function fmterr(err, e, fnname) {
  if (err.code !== undefined) {
    if (__DEV__) {
      err.stack = err.message + e.stack.replace(/    at Object\./, '    at asyncfs.');
    } else {
      Error.captureStackTrace(err);
      err.stack = err.stack.replace(/ at fmterr /, ' at asyncfs.'+fnname+' ');
    }
  }
  return err;
}

function wrap1(fn, fnname) {
  return function() {
    let args = Array.prototype.slice.call(arguments);
    let e;
    if (__DEV__) {
      e = {toString(){ return ''; }};
      Error.captureStackTrace(e);
    }
    return new Promise((resolve, reject) => {
      args.push(function(err, arg1) {
        if (err) {
          reject(fmterr(err, e, fnname));
        } else {
          resolve(arg1);
        }
      })
      fn.apply(fs, args)
    })
  };
}

function wrap2(fn, fnname) {
  return function() {
    let args = Array.prototype.slice.call(arguments);
    let e;
    if (__DEV__) {
      e = {toString(){ return ''; }};
      Error.captureStackTrace(e);
    }
    return new Promise((resolve, reject) => {
      args.push(function(err, arg1, arg2) {
        if (err) {
          reject(fmterr(err, e, fnname));
        } else {
          resolve([arg1, arg2]);
        }
      })
      fn.apply(fs, args)
    })
  }
}

function wrap1_err2bool(fn) { return function() {
  let args = Array.prototype.slice.call(arguments);
  return new Promise((resolve, reject) => {
    args.push(err => { resolve(!err) })
    fn.apply(fs, args)
  })
}}

function mkdirs(path) {
  return new Promise((resolve, reject) => {
    _mkdirs(path, (err) => {
      if (err) reject(err); else resolve();
    })
  })
}
// Example:
// Here, "/foo/bar" exists:
//   /foo/bar/baz/a/b  mkdir, fail ENOENT
//   /foo/bar/baz/a    mkdir, fail ENOENT
//   /foo/bar/baz      mkdir, success
//   /foo/bar/baz/a    mkdir, success
//   /foo/bar/baz/a/b  mkdir, success
//                     done
//
// 
function _mkdirs(path, cb) {
  fs.mkdir(path, function (err) {
    if (!err || err.code === 'EEXIST') {
      return cb();
    } else if (err.code === 'ENOENT') {
      path = require('path').resolve(path)
      var p = path.lastIndexOf('/')
      if (p === -1) {
        cb(err)
      } else {
        _mkdirs(path.substr(0, p), (err) => {
          if (err) {
            cb(err)
          } else {
            fs.mkdir(path, (err) => {
              cb(!err || err.code === 'EEXIST' ? null : err);
            });
          }
        })
      }
    } else {
      cb(err)
    }
  })
}

function copy(srcpath, dstpath) {
  return new Promise((resolve, reject) => {
    var completed = false, cb = function(err) {
      if (!completed) {
        completed = true
        if (err) reject(err); else resolve();
      }
    }
    var r = fs.createReadStream(srcpath), w = fs.createWriteStream(dstpath)
    r.once('error', cb)
    w.once('error', cb)
    w.once('close', cb)
    r.pipe(w)
  })
}
