class TokenEditor {
  constructor(tokenizer, srcfile, visitor) {
    this.tokenizer = tokenizer;
    this.srcfile = srcfile;
    this.visitor = visitor;
  }

  nextToken() {
    var t = this.tokenizer.next();
    return t.done ? null : t.value;
  }

  edit() {
    var tok, tokens, dstCode = '';
    
    while (tok = this.nextToken()) {
      tokens = this.visitor(tok, this);
      if (tokens) {
        //
      } else {
        //
      }

      let chunk = this.srcfile.code.substring(tok.range[0], tok.range[1]);
      console.log(
        'token:',
        tok.type,
        repr(chunk),
        tok.value ? repr(tok.value) : '-',
        `${tok.loc.start.line}:${tok.loc.start.column}–${tok.loc.end.line}:${tok.loc.end.column}`
      );
      dstCode += chunk;
    }

    console.log(dstCode);

    return [this.srcfile.code, null]; // code, sourcemap?
  }
}

class Preprocessor {
  constructor() {
    this.codebuf = null; //new CodeBuffer;
  }

  process(srcfile:SrcFile) {
    var editor = new TokenEditor(Tokenizer(srcfile.code), srcfile, (token, editor) => {
      if (token.type === 'record') {
        console.log('Record!');
      }
    });
    return editor.edit();
  }

}
