async/await/Promise version of Nodejs/IOjs "fs" module, acting as a slot-in replacement.

## Async functions

```js
async rename(oldPath, newPath)

async ftruncate(fd, len)
async truncate(path, len)

async chown(path, uid, gid)
async fchown(fd, uid, gid)
async lchown(path, uid, gid)
async chmod(path, mode)
async fchmod(fd, mode)
async lchmod(path, mode)

async stat(path):Stats
async lstat(path):Stats
async fstat(fd):Stats

async link(srcpath, dstpath)
async symlink(srcpath, dstpath[, type])
async readlink(path):string

async realpath(path[, cache]):string

async unlink(path)
async rmdir(path)
async mkdir(path[, mode])

async readdir(path:string):string[]

async close(fd)
async open(path, flags[, mode]):int

async utimes(path, atime, mtime)
async futimes(fd, atime, mtime)

async fsync(fd)

async write(fd, buffer:Buffer, offset, length[, position]):[written:int, buffer:Buffer]
async write(fd, data:string[, position[, encoding]]):[written:int, data:string]

async read(fd, buffer, offset, length, position):[bytesRead:int, buffer:Buffer]
async readFile(filename[, options]):Buffer|string

async writeFile(filename, data[, options])
async appendFile(filename, data[, options])
async access(path[, mode]):bool
```

## Other functions

```js
watch(filename[, options][, listen])
watchFile(filename[, options], listener)
unwatchFile(filename[, listener])
createReadStream(path[, options]):ReadStream
createWriteStream(path[, options]):WriteStream
```

## Types

```js
Stats
ReadStream
WriteStream
FSWatcher
```

## Callback functions

```js
renameAsync(oldPath, newPath, (err:Error)=>)

ftruncateAsync(fd, len, (err:Error)=>)
truncateAsync(path, len, (err:Error)=>)

chownAsync(path, uid, gid, (err:Error)=>)
fchownAsync(fd, uid, gid, (err:Error)=>)
lchownAsync(path, uid, gid, (err:Error)=>)
chmodAsync(path, mode, (err:Error)=>)
fchmodAsync(fd, mode, (err:Error)=>)
lchmodAsync(path, mode, (err:Error)=>)

statAsync(path, (err:Error, st:Stats)=>)
lstatAsync(path, (err:Error, st:Stats)=>)
fstatAsync(fd, (err:Error, st:Stats)=>)

linkAsync(srcpath, dstpath, (err:Error)=>)
symlinkAsync(srcpath, dstpath[, type], (err:Error)=>)
readlinkAsync(path, (err:Error, target:string)=>)

realpathAsync(path[, cache], (err:Error, path:string)=>)

unlinkAsync(path, (err:Error)=>)
rmdirAsync(path, (err:Error)=>)
mkdirAsync(path[, mode], (err:Error)=>)

readdirAsync(path, (err:Error, entries:string[])=>)

closeAsync(fd, (err:Error)=>)
openAsync(path, flags[, mode], (err:Error, fd:int)=>)

utimesAsync(path, atime, mtime, (err:Error)=>)
futimesAsync(fd, atime, mtime, (err:Error)=>)

fsyncAsync(fd, (err:Error)=>)

writeAsync(fd, buffer:Buffer, offset, length[, position], (err:Error, (written:int,buffer:Buffer))=>)
writeAsync(fd, data:string[, position[, encoding]], (err:Error, (written:int,data:string))=>)

readAsync(fd, buffer, offset, length, position, (err:Error, (bytesRead:int,buffer:Buffer))=>)
readFileAsync(filename[, options], (err:Error, (data:Buffer|string))=>)

writeFileAsync(filename, data[, options], (err:Error)=>)
appendFileAsync(filename, data[, options], (err:Error)=>)
accessAsync(path[, mode], (err:Error)=>)
```

## Sync functions

```js
renameSync(oldPath, newPath)

ftruncateSync(fd, len)
truncateSync(path, len)

chownSync(path, uid, gid)
fchownSync(fd, uid, gid)
lchownSync(path, uid, gid)
chmodSync(path, mode)
fchmodSync(fd, mode)
lchmodSync(path, mode)

statSync(path):Stats
lstatSync(path):Stats
fstatSync(fd):Stats

linkSync(srcpath, dstpath)
symlinkSync(srcpath, dstpath[, type])
readlinkSync(path):string

realpathSync(path[, cache]):string

unlinkSync(path)
rmdirSync(path)
mkdirSync(path[, mode])

readdirSync(path):string[]

closeSync(fd)
openSync(path, flags[, mode]):int

utimesSync(path, atime, mtime)
futimesSync(fd, atime, mtime)

fsyncSync(fd)

writeSync(fd, buffer:Buffer, offset, length[, position]):(written:int,buffer:Buffer)
writeSync(fd, data:string[, position[, encoding]]):(written:int,data:string)

readSync(fd, buffer, offset, length, position):(bytesRead:int,buffer:Buffer)
readFileSync(filename[, options]):(data:Buffer|string)

writeFileSync(filename, data[, options])
appendFileSync(filename, data[, options])
accessSync(path[, mode]) // throws
```

## Using Promises directly

The async functions are really just functions returning Promises, so `async fs.stat(path):Stat` is equivalent to the signature `fs.stat(path):Promise<Stat,Error>`.

Consider the following async/await code:

```js
async function main() {
  let st = await fs.stat("foo.txt")
  console.log(st)
}
main()
```

It is equivalent to the following code using Promise calls:

```js
function main() {
  return new Promise((resolve, reject) => {
    fs.stat.then(st => {
      console.log(st)
      resolve()
    }).catch(reject)
  })
}
main()
```

Sometimes you might want to call these from a non-async context—where "await" is unavailable—in which case dealing with a Promise directly is your only option (or using the regular callback-style functions from the regular "fs" module.)

```js
// somewhere not in an async context
fs.stat.then(st => {
  console.log(st)
}).catch(err => {
  console.error('stat failed:', err.stack || err)
})
```
