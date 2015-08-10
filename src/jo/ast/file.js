// TODO: Generate Flow types for AST from babel-core/lib/types
interface Program {
  body: Node[];
}

interface File {
  name:         string;        // filename, e.g. "foo/bar/baz.js"
  program:      Program;    // program AST
  macros?:      MacroDef[];    // macro definitions
  diagnostics?: Diagnostic[];  // diagnostic messages
}

function configureFileParser(p:Parser, mode:Mode) {
  let _pushComment = p.pushComment;
  let _parse = p.parse;

  p.parse = function parse(fset:FileSet, filename:string, src:string) {
    let s = p.state

    console.log('parse()');

    s.init(p.input = src);
    if (s.pos === 0 && src[0] === "#" && src[1] === "!") {
      p.skipLineComment(2);
    }

    if (mode & ParseComments) {
      p.pushComment = _pushComment;
    } else {
      p.pushComment = function(){};
    }

    let f = _parse.apply(p, arguments);
    // f is of type BabylonFile {
    //   program: Program
    //   comments: Comment[]
    //   tokens: Token[]
    //   macros: Macro[]
    //   diagnostics: Diagnostic[]
    // }

    return { //__proto__: File.prototype,
      name:        filename || '',
      program:     f.program,
      macros:      f.macros,
      diagnostics: f.diagnostics,
    };
  }

  return p;
}
