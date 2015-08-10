import {SourceMapGenerator, SourceMapConsumer} from 'npmjs.com/source-map'
import path from 'path'
import {SrcLocation} from './util'
import {types as t} from 'npmjs.com/babel-core'

class CodeBuffer {
  constructor(sourceDir:string, target:Target) {
    this.code = '';
    this.map = new SourceMapGenerator();
    this.line = 0;
    this.column = 0;
    this.sourceDir = (sourceDir ? sourceDir + '/' : '');
    this.target = target
    this._nextAnonID = 0;
    this.hasStartedVars = false;
  }


  get lineStart() {
    Object.defineProperty(this, 'lineStart', {configurable:true, value:'  , '});
    this.hasStartedVars = true;
    return 'var ';
  }


  resetLineStart() {
    this.hasStartedVars = false;
    Object.defineProperty(this, 'lineStart', {configurable:true, get:() => {
      return CodeBuffer.prototype.lineStart.call(this);
    }});
  }


  appendLine(linechunk, srcfilename, srcloc) {
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


  appendCode(code:string, srcloc:SrcLocation, srcfilename?:string) {
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
    var consumer = new SourceMapConsumer(map);

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


  // addRuntimeImports(runtimeImps, isLast:bool) {
  //   var runtimeRefs = Object.keys(runtimeImps);
  //   for (let i = 0; i !== runtimeRefs.length; i++) {
  //     let ref = runtimeRefs[i];
  //     let imp = runtimeImps[ref];
  //     // assert(imp.specifiers.length === 1)
  //     let spec = imp.specifiers[0];
  //     if (spec.id.name === 'default') {
  //       this.appendLine(
  //         this.lineStart + spec.name.name+' = __$irt(' + JSON.stringify(ref) + ')' +
  //         ((isLast && i === runtimeRefs.length-1) ? ';' : '')
  //       );
  //     } else {
  //       throw new Error('unexpected runtime helper import: importing member, not default');
  //     }
  //   }
  // }


  addModuleImports(importRefs) {
    // Returns an object describing the package refs and symbols used,
    // e.g. code:
    //   import {a, bob as b} from "foo"
    //   import f from "foo"
    //   import {c} from "bar"
    // Returns:
    //   {
    //     "foo": {
    //       nodes: [ Import, Import, Import ]
    //       names: ["a", "bob", "default"]
    //     },
    //     "bar": {
    //       nodes: [ Import ]
    //       names: ["c"]
    //     },
    //   }
    var imports = {};
    var refs = Object.keys(importRefs);
    var lastIndex = refs.length-1;
    refs.forEach((ref, index) => {
      // console.log('addModuleImports ["'+ref+'"] =>', repr(importRefs[ref],2))
      imports[ref] = {
        nodes: importRefs[ref],
        names: this._addModuleImport(ref, importRefs[ref], /*isLastImp=*/index === lastIndex),
      };
    });
    return imports;
  }


  _addModuleImportBase(ref:string, imps:Import[], isLastImp:bool) {
    var requireExpr = this.genRequireExpr(ref);

    if (imps.length === 1 && imps[0].specifiers.length === 0) {
      // Only imported but not actually used. Special case for "testing" but might be used by
      // other packages.
      this.appendLine(requireExpr);
      return [null, null];
    }

    // Is there any default name used for the module?
    for (let imp of imps) {
      for (let spec of imp.specifiers) {
        if ((!spec.imported || spec.imported.name === 'default') && spec.local) {
          // Some file imports the module as "default", so let's use that localized id
          let isLast = (isLastImp && imps.length === 1 && imp.specifiers.length === 1);
          let name = this.addImport(imp, requireExpr, spec, isLast);
          return [spec.local.name, {imp:imp, spec:spec, name:name}]
        }
      }
    }

    // Nothing imports the module as "default". We use an anonymous ID.
    // TODO: refactor to use codebuf2 and when !target.isDevMode, don't append lines but
    //       instead generate more compact code.
    var defaultIDName = this.anonIDName();
    this.appendLine(
      this.lineStart + defaultIDName+' = '+requireExpr,
      // Map this line as being semantically generated from the first occurance of the
      // module import:
      imps[0].srcfile.name,
      imps[0].source.loc
    );

    return [defaultIDName, null];
  }


  _addModuleImportRest(imps:Import[], defaultIDName:string, names:string[]/*MUTATES*/) {
    // Find remaining imports and specs excluding any spec matching defaultIDName
    imps.forEach(imp => {
      imp.specifiers.forEach(spec => {
        if (spec.local && spec.local.name !== defaultIDName) {
          names.push(this.addImport(imp, defaultIDName, spec, /*isLast=*/false));
        }
      })
    })
  }


  _addLastModuleImportRest(imps:Import[], defaultIDName:string, names:string[]/*MUTATES*/) {
    // Version of _addModuleImportRest for the sequentially-last ref imports, where we
    // break up the imps loop into two with buffering in restImp so we can know when we
    // generate the last import statement.

    // Find remaining imports and specs excluding any spec matching defaultIDName
    let restImp = []
    imps.forEach(imp => {
      let specs = [ for (spec of imp.specifiers)
        if (spec.local && spec.local.name !== defaultIDName) spec ];
      if (specs.length !== 0) {
        restImp.push({imp:imp, specs:specs})
      }
    })

    for (let i = 0; i !== restImp.length; i++) {
      let {imp, specs} = restImp[i];
      let isLast = i === restImp.length-1;
      for (let i = 0, lastIndex = specs.length-1; i !== specs.length; i++) {
        names.push(this.addImport(imp, defaultIDName, specs[i], isLast && i === lastIndex));
      }
    }
  }


  _addModuleImport(ref:string, imps:Import[], isLastImp:bool) {
    // Returns a list of spec names as they are exported from the module, meaning
    // that one of the names can be used verbatim against the imported modules' API
    // to retrieve its value.
    var names = [];

    if (imps.length === 1 && imps[0].specifiers.length === 1) {
      // Optimization:
      //    var _file$foo = require("foo");
      //  Instead of:
      //    var _$0 = require("foo");
      //    var x = _$0;
      return [
        this.addImport(imps[0], this.genRequireExpr(ref), imps[0].specifiers[0], isLastImp)
      ];
    }

    // Add module base import e.g. `foo = require("foo")` which is then used for specific imports.
    // If there's no default import of the module, e.g. only `import {x} from "foo"`, then an
    // anonymous ID is returned (and defaultImp is null), and e.g. code like this is generate:
    // `var _$$3 = require("foo")`.
    var [defaultIDName, defaultImp] = this._addModuleImportBase(ref, imps, isLastImp);
    if (defaultImp) {
      names.push(defaultImp.name);
    }
    //console.log('defaultImp (ref="'+ref+'"):', defaultImp)

    if (defaultIDName) {
      if (isLastImp) {
        this._addLastModuleImportRest(imps, defaultIDName, names)
      } else {
        this._addModuleImportRest(imps, defaultIDName, names)
      }
    } // else: no symbol (has no refs)

    return names;
  }


  addImport(imp, moduleCode, spec, isLast:bool) {
    // Returns spec's name in the imported module's API.
    // E.g.
    //    import {x as y} from "foo"
    //           ~~~~~~~~
    // Returns "x" (NOT "y" or "_filename$y")
    var srcline;
    var specName = spec.imported ? spec.imported.name : 'default';

    if (specName === 'default') {
      // E.g. `import x from "foo"` -> var x = im("foo")
      // E.g. `import "foo"`        -> var foo = im("foo")
      if (spec.local) {
        srcline = this.lineStart + spec.local.name + ' = ' + moduleCode;
      } else {
        // E.g. `import _ from "foo"` -> im("foo")
        srcline = '';
        if (this.hasStartedVars) {
          srcline = ';';
          this.resetLineStart();
        }
        srcline += moduleCode;
      }

    } else if (spec.type === 'ImportBatchSpecifier') {
      // E.g. `import * as foo from "foo"`
      if (moduleCode.substr(0,5) === '__$i(') {
        moduleCode = '__$iw(' + moduleCode.substr(5);
      } else if (moduleCode.substr(0,6) === '__$im(') {
        moduleCode = '__$imw(' + moduleCode.substr(6);
      } else {
        // wrap in `iw`
        moduleCode = '__$iw(' + moduleCode + ')';
      }
      srcline = this.lineStart + spec.local.name + ' = ' + moduleCode;

    } else {
      // E.g. `import {x} from "foo"`
      // E.g. `import {x as y} from "foo"`
      srcline = this.lineStart + spec.local.name+' = '+moduleCode+'.'+spec.imported.name;
    }

    if (isLast) {
      srcline += ';';
    }
    this.appendLine(srcline, imp.srcfile.name, imp.loc);
    return specName;
  }


  genRequireExpr(ref) {
    let m;
    if (NPMPkg.refIsNPM(ref)) {
      return '__$i(require(_$NPMROOT+' + JSON.stringify(NPMPkg.stripNPMRefPrefix(ref)) + '))'

    } else if (ref[0] === '/' || this.target.builtInModuleRefs[ref]) {
      return '__$i(require('+JSON.stringify(ref)+'))'

    } else {
      // if (__DEV__) {
      //   assert(!ref.startsWith('./'));
      //   assert(!ref.startsWith('../'));
      // }
      return '__$im(require,'+JSON.stringify(ref)+')'
    }
  }


  appendExport(exp:Export, codegen:Function, asTest:bool=false) {
    let srcloc = SrcLocation(exp.node, exp.file);

    if (exp.name === 'default') {
      if (asTest) {
        throw new Error('test '+this.file.name+' trying to "export default"');
      }
      this.appendLine('exports.__esModule=true;', null, srcloc);
    }

    if (exp.node.type === 'Identifier') {
      // simple path: avoid codegen
      if (exp.name === 'default') {
        this.appendLine('exports["default"]='+exp.node.name+';', null, srcloc);
      } else if (asTest) {
        this.appendLine(
          '__$jotests.set("'+exp.name.replace(/"/,'\\"')+'",'+exp.node.name+');',
          null,
          srcloc
        );
      } else {
        this.appendLine('exports.'+exp.name+'='+exp.node.name+';', null, srcloc);
      }
    } else {
      // value is complex, so we need to codegen from AST
      let expr;
      if (asTest) {
        // __$jotests.set('bar', {...})
        expr = t.callExpression(
          t.memberExpression(t.identifier('__$jotests'), t.identifier('set')),
          [ t.literal(exp.name), exp.node ]
        );
      } else {
        // exports.bar = {...}
        expr = t.assignmentExpression(
          '=',
          t.memberExpression(
            t.identifier('exports'),
            (exp.name === 'default') ? t.literal(exp.name) : t.identifier(exp.name),
            true
          ),
          exp.node
        );
      }
      let code = codegen(
        t.program([ t.expressionStatement(expr) ])
      );
      this.appendCode(code, srcloc);
    }
  }


  // anonIDName():string
  anonIDName() {
    return '_$$' + ((this._nextAnonID++).toString(36));
  }

}
