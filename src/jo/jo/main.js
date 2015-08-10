import {Mainv} from 'jo'
import {SrcError, ParseOpt} from 'jo/util'

function main(argv) {
  if (process.env.JO_PROGRAM_START_TIME) {
    console.log('Startup time:', (Date.now() - process.env.JO_PROGRAM_START_TIME) + 'ms');
  }
  Mainv(argv).catch(err => {
    if (SrcError.canFormat(err)) {
      try {
        let msg = SrcError.format(err);
        if (msg) {
          console.error(msg);
          return process.exit(1);
        }
      } catch (ie) {
        console.error('internal error');
        err = ie;
      }
    }
    let [prog, _] = ParseOpt.prog(process.argv)
    console.error(prog+':', err.stack || err);
    process.exit(2);
  });
}
