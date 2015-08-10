// Automates testing of functions of the form
//   function TestXxx(t:testing.T)
//
// It is sometimes necessary for a test program to do extra setup or teardown before or after
// testing. To support these and other cases, if a test file contains a function:
//   function TestMain(m:testing.M):Promise
// then the generated test will call TestMain(m) instead of running the tests directly.
// TestMain can do whatever setup and teardown is necessary around a call to m.run. It should then
// call process.exit with the result of m.run.
//
// The minimal implementation of TestMain is:
//   function TestMain(m:testing.M) { return m.run() }
// In effect, that is the implementation used when no TestMain is explicitly defined.

import 'term'
import 'runtime'
import 'assert'
import 'path'
import {Duration} from 'time'
import 'util'

// Symbols with contextual meaning
const MatchAny = Symbol('MatchAny') // use in assertions to signify a "anything is a match"
    , Abort    = Symbol('Abort')    // throw inside a test to stop that test from running

// MatchOR can be used with assertStructEQ to accept any of zero or more matches.
//
// Example:
//   let expect = {a:1, b:testing.MatchOR('two', 'three')}
//   testing.assertStructEQ({a:1, b:'two'}, expect)    // passes
//   testing.assertStructEQ({a:1, b:'three'}, expect)  // passes
//   testing.assertStructEQ({a:1, b:'four'}, expect)   // fails
//
// Calling MatchOR without any arguments is equivalent to specifying MatchAny.
// Calling MatchOR with a single argument simply returns the argument.
function MatchOR(...references) {
  let L = references.length;
  if (L === 0) {
    return MatchAny;
  } else if (L === 1) {
    return references[0];
  } else {
    --L;
    return function assertMatchOR(subject, assertFun, _) {
      for (let i = 0; i !== L; ++i) {
        if (assertFun(subject, references[i], i, L)) {
          return true;
        }
      }
      return assertFun(subject, references[L], L, L);
    };
  }
}

// number of lines after and before the line of interest in failure messages
var failCodeContextLines = 1;


function btime() {
  var t = Date.now();
  return function() { return Duration.format(Date.now() - t); }
}


function formatFailureMessage(n) {
  return `(${path.basename(n.filename)}:${n.line}:${n.column})\n${n.codeDescription}`;
}


function sourceDescriptionForCallSite(fun, stackOffs) {
  try {
    var stack = runtime.Stack(fun);
    let n = runtime.SourceForCallSite(stack[stackOffs], failCodeContextLines);
    return formatFailureMessage(n);
  } catch (e) {
    console.error('internal error: ' + (e.stack || e));
  }
}


function sourceLocationForCallSite(fun, stackOffs) {
  try {
    var stack = runtime.Stack(fun);
    let n = runtime.SourceForCallSite(stack[stackOffs], failCodeContextLines);
    return `${path.basename(n.filename)}:${n.line}:${n.column}`;
  } catch (e) {
    console.error('internal error: ' + (e.stack || e));
  }
}


function getMessageForAssertionError(err) {
  let s, m = String(err.stack).match(/[\s ]+at .+\(([^\)]+):(\d+):(\d+)\)($|\n)/m);
  if (m) {
    let line = parseInt(m[2]);
    let column = parseInt(m[3]);
    if (!isNaN(line) && !isNaN(column)) {
      let n = runtime.SourceForLocation(m[1], line, column-1, failCodeContextLines);
      return formatFailureMessage(n);
    }
  }
  return err.message;
}



// B is a type passed to Benchmark functions to manage benchmark timing and to specify the number
// of iterations to run.
class B {
}


// T is passed to Test functions to manage test state and support formatted test logs.
// Logs are accumulated during execution and dumped to standard error when done.
class T {
  constructor(name, fun) {
    this.name = name;
    this.fun = fun;
    this.failures = null;
  }

  _fail(what?:any) {
    if (!this.failures) {
      this.failures = [what];
    } else {
      this.failures.push(what);
    }
  }

  _failNow(what?:any) {
    this._fail(what);
    throw Abort;
  }

  _failmsg(what:any, srcDescr:string) {
    if (what !== null && what !== undefined) {
      let wt = typeof what;
      if (wt === 'object' && what.message) {
        what = String(what.message);
      } else if (wt === 'boolean') {
        what = what ? 'true' : 'false';
      } else if (wt !== 'string') {
        what = String(what);
      }
    } else {
      what = '';
    }
    if (srcDescr) {
      what += ' ' + term.StdoutStyle.grey(srcDescr);
    }
    return what;
  }

  fail(what?:any, stackOffs?:int) {
    this._fail(this._failmsg(
      what,
      typeof stackOffs === 'number' ? sourceDescriptionForCallSite(this.fail, stackOffs) : null
    ));
  }

  failNow(what?:any, stackOffs?:int) {
    this._failNow(this._failmsg(
      what,
      typeof stackOffs === 'number' ? sourceDescriptionForCallSite(this.failNow, stackOffs) : null
    ));
  }

  assert(expr) {
    if (!expr) {
      let s = sourceDescriptionForCallSite(this.assert, 0);
      this._failNow(s || 'assert(' + expr + ') failed');
    }
  }

  assertEQ(a, b) {
    if (!(a === b)) {
      let s = sourceDescriptionForCallSite(this.assertEQ, 0);
      this._failNow('assertEQ(' + a + ' === ' + b + ') failed at ' + (s || ''));
    }
  }

  assertStructEQ(subject, reference) {
    let t = this;
    let repr = util.inspect;
    let seen = new Set;
    let colorSub = term.StdoutStyle.boldMagenta;
    let colorRef = term.StdoutStyle.boldYellow;
    let fail = msg => {
      let s = sourceDescriptionForCallSite(this.assertStructEQ, 0);
      this._failNow('assertStructEQ' + (msg ? ': ' + msg : '') + (s ? ' ' + s : ''));
    }
    let repr0 = v => repr(v,{depth:0});
    function _assertStructEQ(subject, reference, path, returnOnFail) {
      if (subject === reference || reference === MatchAny) { return true; }
      if (typeof reference === 'function') {
        // `reference` is an assertion wrapper
        return reference(subject, function(subject, reference, index, last) {
          return _assertStructEQ(subject, reference, path, index !== last);
        }, returnOnFail);
      }
      if (subject && reference && typeof subject === 'object' && typeof reference === 'object') {
        if (seen.has(subject) || seen.has(reference)) {
          if (returnOnFail) { return false; }
          fail('cyclic structure detected at '+path);
        }
        seen.add(subject);
        seen.add(reference);
        let ret = function(v) {
          seen.delete(reference);
          seen.delete(subject);
          return v;
        }
        if (Symbol.iterator in subject || Symbol.iterator in reference) {
          if (!(Symbol.iterator in subject && Symbol.iterator in reference)) {
            if (returnOnFail) {
              return ret(false);
            }
            fail(path+': '+colorSub(repr0(subject))+' === '+colorRef(repr0(reference)));
          }
          let si = subject[Symbol.iterator](), i = 0;
          let path2 = path ? path+'[' : '[';
          for (let rv of reference) {
            if (!_assertStructEQ(si.next().value, rv, path2+(i++)+']', returnOnFail)) {
              return ret(false);
            }
          }
        } else {
          let path2 = path ? path+'.' : '';
          for (let k in reference) {
            if (!_assertStructEQ(subject[k], reference[k], path2+k, returnOnFail)) {
              return ret(false);
            }
          }
        }
        return ret(true);
      } else {
        if (returnOnFail) { return false; }
        fail(path+': '+colorSub(repr0(subject))+' === '+colorRef(repr0(reference)));
      }
    }
    _assertStructEQ(subject, reference, '', false);
  }

  log(...args:any) {
    process.stdout.write('['+this.name+'] '+args.map(v =>
      util.inspect(v,{colors:process.stdout.isTTY, depth:9})).join(' ')+'\n')
  }

  // format quick reference:
  //   %s => String($)
  //   %d => Number($)
  //   %j => JSON.stringify($)
  // example:
  //   logf("foo: (%j)", [1, 2], [3, 4]) => foo: ([1,2]) [3, 4]
  logf(fmt:string, ...args?:any) {
    process.stdout.write('['+this.name+'] '+util.format.apply(null, arguments)+'\n')
  }

  async run() {
    try {
      let r = this.fun(this);
      if (r instanceof Promise) {
        await r;
      }
    } catch (err) {
      if (err !== Abort) {
        if (err instanceof assert.AssertionError) {
          this._fail(this._failmsg(err.message, getMessageForAssertionError(err)));
        } else {
          this.fail(err.stack);
        }
      }
    }
  }
}

// M is passed to a TestMain function to run the actual tests.
class M {
  constructor({name, tests, benchmarks, verbose}) {
    this.name = name
    this.tests = tests
    this.benchmarks = benchmarks
    this.verbose = verbose
    this.failures = []
  }

  async run() {//:int
    let timeAll = btime();
    let style = term.StdoutStyle;
    const FAIL = style.boldRed('FAIL');
    const PASS = style.boldGreen('pass');
    const OK = style.boldGreen('ok  ');

    await Promise.all(this.tests.map(async t => {
      let timeT;
      if (this.verbose) {
        timeT = btime();
      }
      await t.run();
      if (this.verbose) {
        timeT = timeT();
        let st = t.failures ? FAIL : PASS;
        console.log(st, this.name + ':', style.bold(t.name), '('+timeT+')');
        if (t.failures) {
          t.failures.forEach(msg => console.log(msg));
        }
      }
      if (t.failures) {
        this.failures.push(t);
      }
    }));

    let st = (this.failures.length !== 0) ? FAIL : OK;
    console.log(st+'\t'+this.name + ' ('+timeAll()+')');
    return this.failures.length ? 1 : 0;
  }
}


// MainStart is an internal function, but exported b/c it's used by 'jo test'
function MainStart(pkgid, exported:Map<string,func>, args) {
  let TestMain = exported.get('TestMain');
  if (TestMain) {
    if (typeof TestMain !== 'function') {
      throw new Error('TestMain must be a function');
    }
  } else {
    TestMain = function(m) { return m.run(); };
  }
  let tests = [];
  let benchmarks = [];
  for (let entry of exported) {
    let [name, fun] = entry;
    if (name !== 'TestMain' && typeof fun === 'function') {
      if (name.startsWith('Test')) {
        tests.push(new T(name, fun));
      } else if (name.startsWith('Benchmark')) {
        benchmarks.push(new B(name, fun));
      }
    }
  }

  // Sort by name
  // tests.sort((a, b) => a.name.localeCompare(b.name))
  // benchmarks.sort((a, b) => a.name.localeCompare(b.name))

  let promise = TestMain(new M({
    name: pkgid,
    tests,
    benchmarks,
    verbose: args.indexOf('test.v') !== -1,
  }));

  promise.then(r => {
    process.exit(r);
  }).catch(e => {
    console.error(e.stack || String(e));
    process.exit(2);
  });
}


function init() {
  let n, p = process.argv.indexOf('-test.context-lines');
  if (p !== -1 && !isNaN(n = parseInt(process.argv[p+1])) && n >= 0) {
    failCodeContextLines = n;
  }
}
