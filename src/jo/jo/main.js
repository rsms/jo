import {Mainv} from 'jo'
import {SrcError, ParseOpt} from 'jo/util'

function main(argv) {
  Mainv(argv).catch(err => {
    if (SrcError.canFormat(err)) {
      console.error(SrcError.format(err));
    } else {
      let [prog, _] = ParseOpt.prog(process.argv)
      console.error(prog+':', err.stack || err);
    }
    process.exit(1);
  });
}
