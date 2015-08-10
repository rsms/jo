import {SourceMapGenerator, SourceMapConsumer} from 'npmjs.com/source-map'
import 'assert'

class CodeBuffer2 {
  constructor() {
    this.code   = '';
    this.mapg   = new SourceMapGenerator({ skipValidation: !__DEV__ });
    this.line   = 0;
    this.column = 0;
  }


  sourceMapAsJSON() {
    return this.mapg.toJSON();
  }


  append(code:string, origLoc:SrcLocation) {
    let lineCount = strCount(code, '\n');
    let endColumn = (lineCount !== 0) ? (code.length - code.lastIndexOf('\n')) + 1
                                      : this.column + code.length;

    if (origLoc) {
      this.mapg.addMapping({
        original:  { line: origLoc.startLine, column: origLoc.startColumn },
        generated: { line: this.line, column: this.column },
        source:    origLoc.filename,
      });
      // this.mapg.addMapping({
      //   original:  { line: origLoc.startLine + lineCount, column: endColumn },
      //   generated: { line: this.line + lineCount, column: this.column },
      //   source:    origLoc.filename,
      // });
    }

    this.code  += code;
    this.line  += lineCount;
    this.column = endColumn;
  }


  appendMapped(code:string, map:SourceMap, sourceDir?:string) {
    assert(!(map instanceof SourceMapGenerator)); // must be a sourcemap, not a generator

    // because sourcemaps are line-column based, for this to work we must begin on a new line
    if (this.code.length !== 0 && this.code[this.code.length-1] !== '\n') {
      this.code += '\n';
      ++this.line;
      this.column = 0;
    }

    // we subsequently require code to end in a newline
    if (code[code.length-1] !== '\n') {
      code += '\n';
    }

    var mapc = new SourceMapConsumer(map);

    mapc.sources.forEach(filename => {
      var content = mapc.sourceContentFor(filename);
      if (content != null) {
        this.mapg.setSourceContent(filename, content);
      }
    });

    mapc.eachMapping(m => {
      assert(!!m.source);
      this.mapg.addMapping({
        original:  { line: m.originalLine, column: m.originalColumn },
        generated: { line: m.generatedLine + this.line, column: m.generatedColumn },
        source:    m.source, // filename
      });
    });

    this.code += code;
    this.line += strCount(code, '\n');
  }

}