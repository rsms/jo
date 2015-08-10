// import 'child_process'
//
// const joProgramPath = Env.JOROOT + '/bin/jo' + (__DEV__ ? '-g' : '');
//
//
// class Worker {
//
//   /*async*/ result() {
//     if (this._resultPromise) {
//       throw new Error('already waiting for result of this worker')
//     }
//     return new Promise((resolve, reject) => {
//       this._resultPromise = {resolve, reject};
//     })
//   }
//
//   _onexit(code, signal) {
//     console.log('worker exit', code, signal)
//     if (this._resultPromise) {
//       if (this._error) {
//         this._resultPromise.reject(this._error)
//       } else if (code !== 0) {
//         this._resultPromise.reject(new Error('worker fault '+code))
//       } else {
//         this._resultPromise.resolve('todo result')
//       }
//     }
//   }
//
//   // True if the calling process is a worker
//   static isWorker:bool;
//
//   static spawn(funid:string, params:any) {
//     if (!this.workerFuncs[funid]) {
//       throw new Error(`unknown worker "${funid}"`)
//     }
//     let w = new Worker;
//     try {
//     w.p = child_process.fork(
//       joProgramPath+'dfdf',
//       ['!worker', funid, JSON.stringify(params)]
//     );
//     } catch (err) {
//       console.error('fail fork')
//     }
//     w.p.once('exit', w._onexit.bind(w))
//     w.p.once('error', error => {
//       w._error = error
//     })
//     return w
//   }
//
//   static async main(argv:string[]) {
//     console.log('hello from Worker.main argv:', argv);
//     let funid = argv[4];
//     let worker = this.workerFuncs[funid];
//     if (!worker) {
//       throw `unknown worker "${funid}"`
//     }
//   }
//
//   toString() {
//     return 'Worker#'+this.p.pid
//   }
//
// }
//
// Worker.workerFuncs = {
//   buildpkg: async function(params:any) {
//     console.log('hello from Worker.workerFuncs.buildpkg', params);
//   }
// }
//
// function init() {
//   let argv = process.argv;
//   if (argv[2] === '!worker') {
//     Worker.isWorker = true;
//     process.nextTick(() => {
//       Worker.main(argv).then(
//         () => { process.exit(0) }
//       ).catch(
//         err => { process.exit(2) }
//       )
//     })
//   }
// }
