import {Unique} from './util'
import fs from './asyncfs'
import path from 'path'


var BuildCmd = {
argdesc: '[input]', desc: 'Builds programs and packages',
usage: `[options] [<package>...]
{{prog}} [options] <srcfile>...

Options:
{{options}}

<package>
  If the arguments are a list of source files, build treats them as a list of
  source files specifying a single package.

  When the command line specifies a single main package, build writes the
  resulting executable to -o=<file>. Otherwise build compiles the packages but
  discards the results, serving only as a check that the packages can be built.

  If no arguments are provided, the current working directory is assumed to be
  a package.

-o <file>
  The -o flag specifies the output file name. If not specified, the output
  file name depends on the arguments and derives from the name of the package,
  such as p.pkg.js for package p, unless p is 'main'. If the package is main
  and file names are provided, the file name derives from the first file name
  mentioned, such as f1 for '{{prog}} f1.js f2.js'; with no files provided
  ('{{prog}}'), the output file name is the base name of the containing
  directory.

`,
options: {
  o: '<file>        Output filename',
  target: '<target> Generate product for "browser", "browser-webkit" or "nodejs" (default)',
  a: '              Force rebuilding of packages that are already up-to-date',
  dev: '            Build a development version (unoptimized, debug checks, etc)',
  v: '              Print status messages',
  D: '              Print debugging messages, useful for developing jo',
},

main: async function(opts, args, usage, cb) {
  args = Unique(args.filter(arg => arg.trim()))
  // WorkDir.createSync()  // TODO create lazily

  var pkgs = []

  if (args.length === 0) {
    // The current working directory is assumed to be a package
    pkgs = [await Pkg.fromRef('.')]
  } else if (args.some(SrcFile.filenameMatches)) {
    // The arguments specify a list of source files, which will be treated
    // as belonging to a single package.
    pkgs = [Pkg.fromFiles(args)]
  } else {
    // Specifies one or more packages by ref or dirname
    pkgs = await Promise.all(args.map((ref) => Pkg.fromRef(ref)))
  }

  if (pkgs.length > 1 && opts.o) {
    throw '-o can not be specified when building multiple packages'
  }

  let target = Target.fromID(
    opts.target || TARGET_NODEJS,
    opts.dev ? TARGET_MODE_DEV : TARGET_MODE_RELEASE
  )

  // Setup logging
  let logger = new Logger(opts.D ? Logger.DEBUG : opts.v ? Logger.INFO : Logger.WARN)

  // Build packages
  let buildCtx = new BuildCtx(target, logger)
  await Promise.all(pkgs.map(pkg => buildCtx.buildPkg(pkg)))

  // Make product(s)
  await target.make(pkgs, logger, opts.o)
}}
