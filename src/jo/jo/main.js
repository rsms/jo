import {CodeBuffer as CB, Mainv} from 'jo'
// import xjo from 'jo'
// import * as xjo from 'jo'
import 'jo'
import {SrcError, ParseOpt} from 'jo/util'

var xjo = jo;

type lol = {x:int;}

var Foo = 123;
function Bar() {}
// export var foo = 456, fooobarrr;
// export function lol() {}
// export class bob {}
let x, z;
// function x() {}
// var x = 1;
// export {x as y, z}
// export default function cat() {}
// export default function () {}
// export default {bob, lol};

function main(argv) {
  // conslole.log('hi')
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
