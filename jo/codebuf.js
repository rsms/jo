import sourceMap from 'source-map'
import path from 'path'

class CodeBuffer {
  constructor() {
    this.code = '';
    this.line = 0;
    this.column = 0;
    this.map = new sourceMap.SourceMapGenerator({ file: "out" });
    this._nextAnonID = 0;
  }


  addLine(linechunk, srcfilename, srcloc) {
    ++this.line;
    if (__DEV__) {
      if (linechunk.indexOf('\n') !== -1) {
        throw new Error('unexpected linebreak in linechunk');
      }
    }
    this.code += linechunk + '\n';
    if (srcloc) {
      this.map.addMapping({
        generated: {line: this.line, column: 1 },
        original: { line: srcloc.start.line, column: srcloc.start.column },
        source: srcfilename,
      });
      this.map.addMapping({
        generated: {line: this.line, column: linechunk.length },
        original: { line: srcloc.end.line, column: srcloc.end.column },
        source: srcfilename,
      });
    }
  }


  addMappedCode(code, map) {
    var consumer = new sourceMap.SourceMapConsumer(map);

    for (let i = 0, L = map.sources.length; i !== L; i++) {
      let filename = map.sources[i];
      this.map._sources.add(filename);
      this.map.setSourceContent(filename, map.sourcesContent[i]);
    }

    consumer.eachMapping((mapping) => {
      this.map._mappings.add({
        generatedLine: mapping.generatedLine + this.line,
        generatedColumn: mapping.generatedColumn,
        originalLine: mapping.originalLine,
        originalColumn: mapping.originalColumn,
        source: path.basename(mapping.source), // must match map._sources.add(filename)
      })
    });

    this.code += code + '\n';
    this.line += code.split("\n").length + 1;
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
          '  , '+spec.name.name+' = '+this.genRequireExpr(ref)+
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
    var isLastImp = index===count-1;

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

    defaultImp = this._defaultNameForImports(imps);

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
        '  , ' + defaultIDName+' = '+this.genRequireExpr(ref),
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
        '  , ' + spec.name.name+' = '+impExprCode + close,
        imp.srcfile.name,
        imp.loc
      )
      return 'default';
    } else {
      let idname = spec.id._origName || spec.id.name;
      this.addLine(
        '  , ' + spec.name.name+' = '+impExprCode+'.'+idname + close,
        imp.srcfile.name,
        imp.loc
      )
      return idname;
    }
  }


  genRequireExpr(ref) {
    return '_$import("' + ref.replace(/"/g, '\\"') + '")';
  }


  // anonIDName():string
  anonIDName() {
    return '_$$' + ((this._nextAnonID++).toString(36));
  }

}