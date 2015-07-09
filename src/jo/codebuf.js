import sourceMap from 'npmjs.com/source-map'
import path from 'path'
import {ok as assert} from 'assert'

class CodeBuffer {
  constructor(sourceDir:string, target:Target) {
    this.code = '';
    this.line = 0;
    this.column = 0;
    this.map = new sourceMap.SourceMapGenerator({ file: "out" });
    this.sourceDir = (sourceDir ? sourceDir + '/' : '');
    this.target = target
    this._nextAnonID = 0;
  }


  get lineStart() {
    Object.defineProperty(this, 'lineStart', {value:'  , '});
    return 'var ';
  }


  addLine(linechunk, srcfilename, srcloc) {
    if (__DEV__) {
      if (linechunk.indexOf('\n') !== -1) {
        throw new Error('unexpected linebreak in linechunk');
      }
    }
    this.code += linechunk + '\n';
    if (srcloc) {
      this.addSrcLocMapping(
        srcloc,
        srcfilename,
        {line: this.line, column: 1 },
        {line: this.line, column: linechunk.length }
      );
    }
    ++this.line;
  }


  appendCode(code, srcloc, srcfilename) {
    var startLine = this.line;
    code = code.trim();
    var lines = code.split(/\r?\n/);
    this.code += code + '\n';
    this.line += lines.length + 1;
    let genStart = {line: startLine, column: 1 };
    let genEnd = {line: this.line, column: lines[lines.length-1].length };
    if (srcloc) {
      this.addSrcLocMapping(srcloc, srcfilename, genStart, genEnd);
    } else if (srcfilename) {
      this.map.addMapping({
        original:  {line: 1, column: 1},
        generated: genStart,
        source:    srcfilename,
      });
      this.map.addMapping({
        original:  {line: lines.length, column: 1},
        generated: genEnd,
        source:    srcfilename,
      });
    }
  }


  addSrcLocMapping(srcloc, srcfilename, genStart, genEnd) {
    srcfilename = this.sourceDir + path.basename(srcfilename || srcloc.filename);
    this.map.addMapping({
      original:  {
        line:   srcloc.startLine === undefined ? srcloc.start.line : srcloc.startLine,
        column: srcloc.startColumn === undefined ? srcloc.start.column : srcloc.startColumn,
      },
      generated: genStart,
      source:    srcfilename,
    });
    this.map.addMapping({
      original:  {
        line:   srcloc.endLine === undefined ? srcloc.end.line : srcloc.endLine,
        column: srcloc.endColumn === undefined ? srcloc.end.column : srcloc.endColumn,
      },
      generated: genEnd,
      source:    srcfilename,
    });
  }


  addMappedCode(code, map) {
    var consumer = new sourceMap.SourceMapConsumer(map);

    for (let i = 0, L = map.sources.length; i !== L; i++) {
      let filename = this.sourceDir + map.sources[i];
      this.map._sources.add(filename);
      this.map.setSourceContent(filename, map.sourcesContent[i]);
    }

    consumer.eachMapping((mapping) => {
      this.map._mappings.add({
        generatedLine: mapping.generatedLine + this.line,
        generatedColumn: mapping.generatedColumn,
        originalLine: mapping.originalLine,
        originalColumn: mapping.originalColumn,
        source: this.sourceDir + path.basename(mapping.source),
          //^ must match map._sources.add(filename)
      })
    });

    this.code += code + '\n';
    this.line += code.split(/\r?\n/).length;
  }


  addRuntimeImports(runtimeImps, isLast:bool) {
    var runtimeRefs = Object.keys(runtimeImps);
    for (let i = 0; i !== runtimeRefs.length; i++) {
      let ref = runtimeRefs[i];
      let imp = runtimeImps[ref];
      // assert(imp.specifiers.length === 1)
      let spec = imp.specifiers[0];
      if (spec.id.name === 'default') {
        this.addLine(
          this.lineStart + spec.name.name+' = __$irt(' + JSON.stringify(ref) + ')' +
          ((isLast && i === runtimeRefs.length-1) ? ';' : '')
        );
      } else {
        throw new Error('unexpected runtime helper import: importing member, not default');
      }
    }
  }


  addModuleImports(importRefs) {
    var imports = {};
    var refs = Object.keys(importRefs);
    refs.forEach((ref, index) => {
      imports[ref] = {
        nodes: importRefs[ref],
        names: this.addModuleImport(ref, importRefs[ref], index, refs.length),
      };
    });
    return imports;
  }


  addModuleImport(ref, imps, index, count) {
    var names = [];
    var defaultIDName;
    var isLastImp = index === count-1;

    if (imps.length === 1) {
      // Attempt optimization:
      //  Instead of:
      //    var _$0 = require("foo");
      //    var x = _$0 ...
      //  Do:
      //    var _file$foo = require("foo");
      if (imps[0].specifiers.length === 1) {
        return [this.addImport(
          imps[0],
          this.genRequireExpr(ref),
          imps[0].specifiers[0],
          isLastImp
        )];
      }
    }

    let defaultImp = this._defaultNameForImports(imps);

    if (defaultImp) {
      // Only one file imports the module as "default", so we avoid anonID
      defaultIDName = defaultImp.spec.name.name;
      names.push(this.addImport(
        defaultImp.imp,
        this.genRequireExpr(ref),
        defaultImp.spec,
        /*isLast=*/(isLastImp && imps.length === 1)
      ));
    } else {
      // Nothing imports the module as "default". We use an anonymous ID.
      defaultIDName = this.anonIDName();
      this.addLine(
        this.lineStart + defaultIDName+' = '+this.genRequireExpr(ref),
        imps[0].srcfile.name,
        imps[0].source.loc
      );
    }

    var specs, remainingImps = [for(imp of imps)
      if ((specs = [for (s of imp.specifiers) if (s.name.name !== defaultIDName) s]).length)
        {imp:imp, specs:specs}];

    for (let i = 0; i !== remainingImps.length; i++) {
      let {imp, specs} = remainingImps[i];
      let isLast = isLastImp && i === remainingImps.length-1;
      for (let i = 0, lastIndex = specs.length-1; i !== specs.length; i++) {
        let spec = specs[i];
        names.push(this.addImport(
          imp,
          defaultIDName,
          spec,
          isLast && i === lastIndex
        ));
      }
    }

    return names;
  }


  _defaultNameForImports(imps) {
    // Is there any default name used for the module?
    for (let imp of imps) {
      for (let spec of imp.specifiers) {
        if (spec.default) {
          return {imp:imp, spec:spec};
        }
      }
    }
  }


  addImport(imp, impExprCode, spec, isLast:bool) {
    var close = isLast ? ';' : '';
    if (spec.default) {
      this.addLine(
        this.lineStart + spec.name.name+' = '+impExprCode + close,
        imp.srcfile.name,
        imp.loc
      )
      return 'default';

    } else if (spec.type === 'ImportBatchSpecifier') {
      // import * as x from 'y'
      //        ^
      let idname = spec.name._origName || spec.name.name;
      if (impExprCode.substr(0,5) === '__$i(') {
        impExprCode = '__$iw(' + impExprCode.substr(5);
      } else if (impExprCode.substr(0,6) === '__$im(') {
        impExprCode = '__$imw(' + impExprCode.substr(6);
      } else {
        // wrap in `iw`
        impExprCode = '__$iw(' + impExprCode + ')';
      }
      this.addLine(
        this.lineStart + spec.name.name + ' = ' + impExprCode + close,
        imp.srcfile.name,
        imp.loc
      )
      return idname;

    } else {
      let idname = spec.id._origName || spec.id.name;
      this.addLine(
        this.lineStart + spec.name.name+' = '+impExprCode+'.'+idname + close,
        imp.srcfile.name,
        imp.loc
      )
      return idname;
    }
  }


  genRequireExpr(ref) {
    let m;
    if (NPMPkg.refIsNPM(ref)) {
      return '__$i(require('+JSON.stringify(NPMPkg.stripNPMRefPrefix(ref))+'))'
    } else if (ref[0] === '.' || ref[0] === '/' || this.target.builtInModuleRefs[ref]) {
      return '__$i(require('+JSON.stringify(ref)+'))'
    } else {
      return '__$im(require,'+JSON.stringify(ref)+')'
    }
  }


  // anonIDName():string
  anonIDName() {
    return '_$$' + ((this._nextAnonID++).toString(36));
  }

}