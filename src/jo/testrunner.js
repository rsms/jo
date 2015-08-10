import 'child_process'
import 'os'
import {Duration} from 'time'

type TestProgram = {
  filename:string; // executable
  workdir?:string; // working directory
};

class testRunner {
  constructor(opts) {
    this.opts = opts
    this.processes = new Set; // Set<ChildProcess>
    this.timeoutTimer = opts.timeout ? setTimeout(this.onTimeout.bind(this), opts.timeout) : null;
    this.programEnv = Object.assign({}, process.env, {
      NODE_PATH: Env.JOROOT + '/node_modules',
    });
    if (process.env.NODE_PATH) {
      this.programEnv.NODE_PATH += ':' + process.env.NODE_PATH;
    }
  }


  onTimeout() {
    this.processes.forEach(p => p.kill('SIGKILL'));
    this.end('test timed out after '+Duration.format(this.opts.timeout));
  }


  run(programs:TestProgram[], args:string[]) { //:Promise
    return new Promise((resolve, reject) => {
      // assert(!this.end);
      this.end = (err, codes) => {
        this.end = function(){ console.log('this.end called again'); };
        if (err) {
          reject(err)
        } else {
          resolve(codes)
        }
      }
      Promise.all(programs.map(program =>
        this.runTestProgram(program, args))).then(codes => this.end(null, codes))
    });
  }


  runTestProgram(program:TestProgram, args:string[]) { //:Promise
    let p = child_process.spawn(program.filename, args, {
      stdio: 'inherit',
      env: this.programEnv,
      cwd: program.workdir || os.tmpdir(),
    });
    this.processes.add(p);
    return new Promise((resolve, reject) => {
      p.once('exit', code => {
        this.processes.delete(p);
        resolve(code);
      });
      p.once('error', reject);
    });
  }
}

async function TestRunner(programs:TestProgram[], args:string[], opts) { //:bool
  let r = new testRunner(opts);
  let exitCodes = await r.run(programs, args);
  return !exitCodes.some(c => c !== 0);
}
