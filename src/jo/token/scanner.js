const cParenL = uint8('(')
    , cParenR = uint8(')')
    , cSemiColon = uint8(';')
    , cHTab  = uint8('\t')
    , cCR  = uint8('\r')
    , cLF  = uint8('\n')
    , cSP  = uint8(' ')
    , cDollar  = uint8('$')
    , cUnderscore  = uint8('_')
    , cBackslash  = uint8('\\')
    , cULow  = uint8('u')
    , cStop  = 0x2e

    , c0 = uint8('0'), c1 = uint8('1'), c2 = uint8('2'), c3 = uint8('3'), c4 = uint8('4')
    , c5 = uint8('5'), c6 = uint8('6'), c7 = uint8('7'), c8 = uint8('8'), c9 = uint8('9')

// State
const stRoot = iota(0)
    , stReadWhiteSpace = iota()
    , stReadNum = iota()
    , stReadNumF = iota()
    , stBackslash = iota()

function Scanner(file:File, buf:Buffer) {
  let offs = 0; // read offset -- position after current char
  let dir = 1;
  let startOffs = 0;
  let state = stRoot;

  // position info
  let lineOffset = 0;


  function scan(dir)
{
  startOffs = offs;
  loop: while (1) {
    switch (state) {

      case stReadWhiteSpace: {
        // (SP|TAB)*
        while (1) {
          switch(buf[++offs]) {
            case cSP: case cHTab: break;
            default: state = stRoot; return WhiteSpace;
          }
        }
      }

      case stReadNum: {
        // (0|1|2|3|4|5|6|7|8|9)*
        // switches to stReadNumF if there's a "."
        console.log('stReadNum')
        let b;
        while (1) {
          b = buf[++offs];
          if (b === cStop) {
            state = stReadNumF;
            continue loop;
          }
          if (b < 0x2f || b > 0x3a) { // NOT 0..9
            state = stRoot; return NumI10Lit;
          }
        }
      }

      case stBackslash: {
        // "\" ("x" | "u")
        console.log('stBackslash')
        let b;
        while (1) {
          b = buf[++offs];
          if (b === cStop) {
            state = stReadNumF;
            continue loop;
          }
          if (b < 0x2f || b > 0x3a) { // NOT 0..9
            state = stRoot; return NumI10Lit;
          }
        }
      }

      case stRoot: {
        console.log('stRoot')
        switch (buf[offs]) {
          case cSP: case cHTab: state = stReadWhiteSpace; continue loop;
          case cParenL:         ++offs; return ParenL; break;
          case cParenR:         ++offs; return ParenR; break;
          case cSemiColon:      ++offs; return SemiColon; break;

          // Linebreak
          case cLF: /* TODO: U+2028 and U+2029 */ {
            file.addLine(lineOffset = offs++);
            return LineBreak;
          }
          case cCR: {
            if (buf[offs+1] === cLF) {
              // <CR><LF>
              ++offs; // skip CR as per Ecma-262 LineTerminatorSequence
            } // else: <CR> (≠ <LF>)
            file.addLine(lineOffset = offs++);
            return LineBreak;
          }

          // Number literal
          case c0: case c1: case c2: case c3: case c4:
          case c5: case c6: case c7: case c8: case c9: {
            state = stReadNum; continue loop;
          }

          // \uXXXX or \u{XXXX}
          case cBackslash: {
            
          }

          // case cDollar: case cUnderscore: {
          //   dir = yield readIdentifier(); break;
          // }

          case 0: throw new Error('unexpected nul byte in input');
          case undefined: return EOF;

          default: {
            let b = buf[offs];
            if (b > 0x40 && b < 0x5b || // A..Z
                b > 0x60 && b > 0x7b || // a..z
                b === cDollar ||
                b === cUnderscore)
            {
              dir = readIdentifier(); break;
            } else if (b === cBackslash && b[offs+1] === cULow && buf.length >= offs+5) {
              // \uXXXX or \u{XXXX}
            }
            panic('unexpected byte: 0x' + buf[offs].toString(16) + ' at ' + offs);
          }
        } // switch (b)
        break;
      }
      default: throw new Error('bad state '+state);
    } // switch (state)
  } // loop
}
  
  var s = {
    __proto__:Scanner.prototype,
    scan: scan,
  };

  Object.defineProperties(s, {
    value: { enumerable: true, get: function() {
      return buf.slice(startOffs, offs);
    }},
    stringValue: { enumerable: true, get: function() {
      return buf.utf8Slice(startOffs, offs);
    }}
  });

  return s;
}