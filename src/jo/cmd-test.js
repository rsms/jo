import {Duration} from 'time'

var TestCmd = {
argdesc: '[input]', desc: 'Tests programs and packages',
usage: `[build and test flags] [<package>...] [flags for test binary]

'jo test' automates testing the packages named by the import paths.
It prints a summary of the test results in the format:

  ok   jo/util         0.011s
  FAIL jo/remotectrl   0.022s
  ok   jo/transformers 0.033s
  ...

followed by detailed output for each failed package.

'jo test' recompiles each package along with any files with names matching
the file pattern "*_test.js".
Files whose names begin with "_" (including "_test.js") or "." are ignored.

In addition to the build flags, the flags handled by 'go test' itself are:

  -timeout <duration>
      Sets an aggregate time limit for all tests.

  <duration>
      A positive number with suffix "ms" or "s".

For more about build flags, see 'jo help build'.
`,

options: Object.assign({
  timeout: '<duration>  Sets an aggregate time limit for all tests',
}, BuildCmd.options),

main: async function(opts, args, usage, cb) {
  opts = Object.assign({_testing:true}, opts);
  let pkgs = await BuildCmd.main(opts, args, usage, cb);
  let programs = pkgs.map(pkg => { return /*TestProgram*/ {
    filename: pkg.testModule.program.filename,
    workdir: pkg.dir
  }});

  if (opts.v || opts.D) {
    args.push('test.v');
  }
  if (opts.timeout) {
    opts.timeout = Duration.parse(opts.timeout);
  }
  // process.stdout.write(require('fs').readFileSync(pkgs[0].testModule.program.filename))
  let ok = await TestRunner(programs, args, opts);
  if (!ok) {
    process.exit(1); // TODO FIXME: doesn't work with remotectrl
  }
  // child_process.spawn('/bin/cp', ['-a', pkgs[0].testModule.program.filename, './out-test-g']);
}}
