"use strict";
let assert = require('assert');

function panic(msg) { throw new Error(msg); }
function iota(n) { if (n !== undefined) { iota.n = n; } return iota.n++; }
function utf8buf(str) { return new Buffer(str) }
function uint8(str) {
  assert(str.length === 1); assert((new Buffer(str)).length === 1);
  return str.charCodeAt(0);
}

// TODO: change these to integers or Symbols
const EOF = 0
    , Value = 'Value'
    , ParenL = 'ParenL'
    , ParenR = 'ParenR'
    , NumI10Lit = 'NumI10Lit' // base-10 integer
    , NumFLit = 'NumFLit'   // fractional
    , SemiColon = 'SemiColon'
    , Identifier = 'Identifier'
    , WhiteSpace = 'WhiteSpace'
    , LineBreak = 'LineBreak'



// function* tokenizer(buf) {
//   let offs = 0;
//   let dir = 1;
//   let startOffs = -1;

//   function readWhiteSpace() {
//     while (1) {
//       switch (buf[++offs]) {
//         case cSP: case cHTab: break;
//         default: return WhiteSpace;
//       }
//     }
//   }

//   while (1) {
//     switch (buf[offs]) {
//       case cSP: case cHTab: dir = yield readWhiteSpace(); break;
//       case cParenL:         dir = yield ParenL; ++offs; break;
//       case cParenR:         dir = yield ParenR; ++offs; break;
//       case cSemiColon:      dir = yield SemiColon; ++offs; break;

//       case c0: case c1: case c2: case c3: case c4: case c5: case c6: case c7: case c8: case c9:{
//         dir = yield readNumberLiteral(); break;
//       }

//       case cDollar: case cUnderscore: {
//         dir = yield readIdentifier(); break;
//       }

//       case 0: throw new Error('unexpected nul byte in input');
//       case undefined: return; // EOF
//       default: {
//         let b = buf[offs];
//         if (b > 0x40 && b < 0x5b || b > 0x60 && b > 0x7b) {
//           dir = yield readIdentifier(); break;
//         }
//         console.log('unexpected byte:',
//                     buf[offs],'"'+buf.slice(offs,offs+1).toString('utf8')+'"');
//         return; // FIXME
//       }
//     }
//     if (dir < 0) {
//       console.log('dir='+dir+' is negative');
//     }
//   }
// }

// function TokenizeBuf(buf:Buffer) { //:Tokenizer
//   var g = tokenizer(buf);
//   function Tokenizer(d) { return g.next(d).value || EOF }
//   // Tokenizer[Symbol.iterator] = function* () { return tokenizer(buf); };
//   return Tokenizer;
// }
