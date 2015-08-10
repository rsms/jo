import {Unique} from './util'

const defaultTarget = 'nodejs';

var BuildCmd = {
argdesc: '[input]', desc: 'Builds programs and packages',

get usage() { let usage =
`[options] [<package>...]
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
  directory. If "-" is specified as the output file, output is written to stdout.

-target <target>
  Specify product target, where <target> can be one of:
{{targets}}
`;
  let targets = '';
  for (let targetID in Targets) {
    let target = Targets[targetID];
    targets += '    ' + targetID + (targetID === defaultTarget ? ' (default)' : '') + '\n';
  }
  let params = {
    targets: targets,
    defaultTarget: defaultTarget,
  };
  usage = usage.replace(/\{\{([^\}]+)\}\}/g, (verbatim, k) => params[k] ? params[k] : verbatim )
  return usage;
},

options: {
  o: '<file>        Output filename',
  target: '<target> Generate products for a specific target (defaults to "'+defaultTarget+'")',
  a: '              Force rebuilding of packages that are already up-to-date',
  globals: '<names> Comma separated list of custom global JS identifiers',
  dev: '            Build a development version (unoptimized, debug checks, etc)',
  dynamic: "        When making a program, load imported modules from disk at runtime rather than creating a statically-linked, self-contained program.",
  v: '              Print status messages',
  D: '              Print debugging messages, useful for developing jo',
  work: '       print the name of the temporary work directory and do not delete it when exiting',
},

main: async function(opts, args, usage, cb) { //:Pkg[]
  args = Unique(args.filter(arg => arg.trim()))

  if (opts.work) {
    console.log('workdir:', WorkDir.path);
  } else {
    WorkDir.enableRemoveAtExit();
  }

  var pkgs = [];

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

  // Setup logging
  let logger = new Logger(opts.D ? Logger.DEBUG : opts.v ? Logger.INFO : Logger.WARN)

  // Target
  let targetMode = opts.dev ? TARGET_MODE_DEV : TARGET_MODE_RELEASE;
  let target = Target.create(opts.target || defaultTarget, targetMode, {
    logger: logger,
    output: opts.o,
    globals: opts.globals ? opts.globals.split(/[\s ]*,[\s ]*/g) : null,
    staticLinking: !opts.dynamic,
  })

  // Target pre-processing
  if (target.preMake) {
    await target.preMake(pkgs)
  }

  // Build!
  let buildCtx = new BuildCtx(target, logger, {
    forceRebuild: !!opts.a,
    buildTests: !!opts._testing,
  });
  await Promise.all(pkgs.map(pkg => buildCtx.buildPkg(pkg)))

  // Target post-processing
  if (target.postMake) {
    await target.postMake(pkgs)
  }

  return pkgs;
}};


function lazyInitUsage() {
  let targets = '';
  for (let targetID in Targets) {
    let target = Targets[targetID];
    targets += '    ' + targetID + (targetID === defaultTarget ? ' (default)' : '') + '\n';
  }
  let params = {
    targets: targets,
    defaultTarget: defaultTarget,
  };
  BuildCmd.usage = BuildCmd.usage.replace(/\{\{([^\}]+)\}\}/g, (verbatim, k) =>
    params[k] ? params[k] : verbatim )
}
