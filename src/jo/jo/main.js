import {Mainv} from 'jo'
import {SrcError, parseopt} from 'jo/util'

function main(argv) {
  Mainv(argv).catch(err => {
    if (SrcError.canFormat(err)) {
      console.error(SrcError.format(err));
    } else {
      let [prog, _] = parseopt.prog(process.argv)
      console.error(prog+':', err.stack || err);
    }
    process.exit(1);
  });
}
