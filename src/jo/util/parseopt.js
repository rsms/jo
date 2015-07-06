import path from 'path'

// Parse options, go-style
//
// Examples of supported option styles:
//  -b --b
//  -foo --foo
//  -bar v --bar v -bar=v --bar=v
//
// ParseOpt(opts:{string:any}, args:string[], usage:string|function, hiddenOpts:{string:any}) ->
//   [optv:{string:any}, args:string[], showusage:function()]
function ParseOpt(opts, args, usage, prog, hiddenOpts) {
  var optdesc = {}, nopts = 0, helpops = 'help', opmaxlen = helpops.length;
  var optvals = {}, hiddenOptDesc = {}
  var spaces = '                                                                 ';
  var opRE = /^(?:<([^>]+)>)?\s*(.+)\s*$/;

  Object.keys(opts).forEach(function (op) {
    var m;
    if (opts[op]) {
      m = opRE.exec(opts[op]);
      optdesc[op] = {desc: m[2], val: m[1]};
    } else {
      optdesc[op] = {desc: ''};
    }
    opmaxlen = Math.max(
      opmaxlen,
      op.length + (optdesc[op].val ? (' <'+optdesc[op].val+'>').length : 0)
    );
    ++nopts;
  });

  if (hiddenOpts) Object.keys(hiddenOpts).forEach(function (op) {
    var m;
    if (hiddenOpts[op]) {
      m = opRE.exec(hiddenOpts[op]);
      hiddenOptDesc[op] = {desc: m[2], val: m[1]};
    } else {
      hiddenOptDesc[op] = {desc: ''};
    }
  });

  var showusage = function (error) {
    if (error) {
      if (typeof error === 'string') {
        process.stderr.write(prog + ': ' + error + ". See '"+prog+" -help'\n");
      } else {
        process.stderr.write(prog + ': ' + (error.stack || String(error)) + '\n');
      }
    } else {
      var s = (usage ? usage :
               nopts ? '{{prog}} [options] [arg...]\noptions:\n{{options}}\n' :
                       '{{prog}} [arg...]\n'),
        vars = {
        prog:    prog,
        options: nopts ?
          '  ' + [
            '-' + helpops + spaces.substr(0, opmaxlen - helpops.length) + '  Show help'
          ].concat(Object.keys(optdesc).map(function (op) {
            var s = op;
            if (optdesc[op].val) {
              s += '=<'+optdesc[op].val+'>';
            }
            return '-' + s + spaces.substr(0, opmaxlen - s.length) +
              (optdesc[op].desc ? '  ' + optdesc[op].desc : '');
          })).join('\n  ')
          : ''
      };
      s = s.replace(/\{\{([^\}]+)\}\}/g, function(a,v){ return vars[v] || a; });
      process.stderr.write(s);
    }
    process.exit(error ? 2 : 0);
  };

  if (typeof usage === 'function') { showusage = usage; }

  var i, a, v, arg, op, argRE = /^\-\-?([^\s=]+)(?:=(.+))?$/;

  for (i = 0; i !== args.length; ++i) {
    if (!(arg = args[i]) || !(a = argRE.exec(arg))) {
      break;
    }
    v = a[2]; // -x=(v)
    a = a[1]; // -(x)
    if (!optdesc[a] && a === 'h' || a === 'help') {
      return showusage();
    }
    op = optdesc[a] || hiddenOptDesc[a];
    if (!op) {
      return showusage('unknown option ' + arg);
    }
    if (op.val) { // read option value
      if (v) {
        optvals[a] = v;
      } else if ( !args[i+1] || args[i+1][0] === '-' || !(optvals[a] = args[++i]) ) {
        return showusage('missing <'+op.val+'> for '+arg);
      }
    } else {
      optvals[a] = true;
    }
  }

  args = args.slice(i);
  return [optvals, args, showusage];
}

// prog(argv:string[]):[prog:string, argvRest:string[]]
ParseOpt.prog = function (argv) {
  let prog = process.env._;
  if (!prog) {
    prog = path.relative(process.cwd(), (argv[0].indexOf('/node') === -1) ? argv[0] : argv[1]);
  }
  return [prog, argv.slice(2)]
};

