import {TermStyle} from './util'

// interface Logger {
//   debug(arg:any...)
//   info(arg:any...)
//   warn(arg:any...)
//   error(arg:any...)
// }

class Logger {
  constructor(level) {
    this.level = level
    var So = this.style = TermStyle.stdout
    var Se = this.errstyle = TermStyle.stderr
    var werr = function(style, args) {
      process.stderr.write(style.open);
      console.error.apply(console, args);
      process.stderr.write(style.close);
    }
    if (level >= Logger.DEBUG) {
      this.debug = (...args) => { console.log.apply(console, args); }
    }
    if (level >= Logger.INFO) {
      this.info = (...args) => { console.log.apply(console, args); }
    }
    if (level >= Logger.WARN) {
      this.warn = (...args) => { console.log.apply(console, args); }
    }
    if (level >= Logger.ERROR) {
      this.error = (...args) => { werr(So.boldRed, args); }
    }
    this.verbosityMap = {
      [this.DEBUG]: this.debug.bind(this),
      [this.INFO]:  this.info.bind(this),
      [this.WARN]:  this.warn.bind(this),
      [this.ERROR]: this.error.bind(this),
    }
  }

  debug(..._) {}
  info(..._) {}
  warn(..._) {}
  error(..._) {}

  log(verbosity, ...args) {
    this.verbosityMap[verbosity](...args)
  }

}

Logger.DEBUG = 3
Logger.INFO  = 2
Logger.WARN  = 1
Logger.ERROR = 0
