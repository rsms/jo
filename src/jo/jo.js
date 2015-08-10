import {ParseOpt} from './util'

let usage =
`Jo builds JavaScript programs
{{prog}} <command>

Commands:
{{commands}}

Terminology:
  <pkg>     Packages to build. Can either be a directory (if starting with "." or "/"),
            or a <pkgref>, which in the latter case the package is built from JOPATH.
            Defaults to the current working directory if none specified.

  <pkgref>  Package name with optional "@variant" suffix. What the variant means depends on
            the source type. For a git repository, the variant is a branch, tag or commit.

`

let options = {};
var Commands = {};

async function Mainv(argv:string[]) {
  let [prog, argvRest] = ParseOpt.prog(argv)
  let [opts, args, dieusage] = ParseOpt(options, argvRest, usage, prog);

  if (args.length === 0) {
    return dieusage('no command specified')
  }

  let cmdname = args[0]
  if (cmdname === 'help') {
    if (args.length === 1 || (args[1] && args[1][0] === '-')) {
      return dieusage()
    }
    args = [(cmdname = args[1]), '-help']
  }

  let cmd = Commands[cmdname]
  if (!cmd) {
    return dieusage(JSON.stringify(cmdname)+' is not a command')
  }

  let cmdusage = "{{prog}}" + (cmd.usage ? " " + cmd.usage : "\n")
  let [cmdopts, cmdargs, cmddieusage] = ParseOpt(
    cmd.options || {},
    args.slice(1),
    cmdusage,
    prog+" "+cmdname,
    options // hiddenOpts
  )

  for (let k of Object.keys(opts)) {
    if (cmdopts[k] === undefined || cmdopts[k] === null) cmdopts[k] = opts[k]
  }

  return await cmd.main.call(cmd, cmdopts, cmdargs, cmddieusage);
}


function init() {
  Commands = {
    build:      BuildCmd,
    test:       TestCmd,
    remotectrl: RemoteControlCmd,
    env:        EnvCmd,
    help:       {argdesc:'<cmd>', desc:'Show help for a command'}
  };
  let cmds = Object.keys(Commands).map(name =>
    [(Commands[name].argdesc ? name + ' ' + Commands[name].argdesc : name), Commands[name]] )
  let cmdNameMaxLen = cmds.reduce((p, c) => Math.max(p, c[0].length), 0)
  let commandsUsage = cmds.map(c =>
    '  ' + c[0] +
    ('                                               '.substr(0,cmdNameMaxLen - c[0].length)) +
    '  ' + c[1].desc
  ).join('\n')
  usage = usage.replace(/\{\{commands\}\}/g, commandsUsage)
}
