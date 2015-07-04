"use strict";
var recast = require('recast');
var B = recast.types.builders;

import {JSIdentifier, SrcError, SrcLocation, repr, Unique} from './util'

import * as babel from 'babel'
import BabelFile from 'babel/lib/babel/transformation/file';
import Transformer from 'babel/lib/babel/transformation/transformer'
import BabelGen from 'babel/lib/babel/generation'
import {
  ModuleTransformer,
  FileLocalVarsTransformer,
  ClassHierarchyTransformer
} from './transformers'

// Register jo transformers (wish there was a non-mutating API for this)
babel.transform.transformers['jo.classes'] =
  new Transformer('jo.classes', ClassHierarchyTransformer);
babel.transform.transformers['jo.modules'] =
  new Transformer('jo.modules', ModuleTransformer);
babel.transform.transformers['jo.fileLocalVars'] =
  new Transformer('jo.fileLocalVars', FileLocalVarsTransformer);

function ExportError(file, node, message, fixSuggestion, related) {
  return SrcError('ExportError', SrcLocation(node, file), message, fixSuggestion, related);
}

function ReferenceError(file, node, message, related) {
  return SrcError('ReferenceError', SrcLocation(node, file), message, null, related);
}

function CyclicReferenceError(pkg, name, fileA, fileB, deps, onlyClasses:bool) {
  let errs = [
    { message: `"${name}" defined here`,
      srcloc:  SrcLocation(fileB.definedIDs[name].node, fileB) },
    { message: `"${name}" referenced here`,
      srcloc:  SrcLocation(fileA.unresolvedIDs[name].node, fileA) }
  ];
  deps.forEach(dep => {
    if (!onlyClasses || dep.defNode.type === 'ClassExpression') {
      errs.push({
        message: `"${dep.name}" defined here`,
        srcloc:  SrcLocation(dep.defNode, fileA)
      });
      errs.push({
        message: `"${dep.name}" referenced here`,
        srcloc:  SrcLocation(dep.refNode, fileB)
      });
    }
  });
  return ReferenceError(
    null,
    null,
    `cyclic dependency between source files "${fileA.name}" and "${fileB.name}"`+
    ` in package "${pkg.id}"`,
    errs
  );
}


// interface SrcFile {
//   dir:string       // e.g. "/abs/path/foo"
//   relpath:string   // e.g. "foo/bar.js"
//   name:string      // e.g. "bar.js"
//   st:fs.Stat
//   files:SrcFile[]  // if st.isDirectory()
// }

// interface Pkg {
//   imports:{pkgref: [Import], ...},
//   exports:{identifier: Export, ...},
//   build:Build
//   files:SrcFile[]
// }

// interface SrcOrigin {
//   file:SrcFile
//   start:{line:int, column:int}
//   end:{line:int, column:int}
// }

// interface Import {
//   ref:string                      // e.g. `import "lol/foo"` => 'lol/foo'
//   moduleID:AST.Identifier         // e.g. `import foo from "lol/foo"` => 'foo'
//   members:[{asID: AST.Identifier, srcID:AST.Identifier}, ...]
//      e.g. `import {Foo as bar} from "foo"` => {bar:'Foo'}
//   node:ASTNode                    // the import node
// }

// interface Export {
//   default:bool        // e.g. `export default {...}` => true
//   specifiers:{id:string, node:ASTNode}[]
//     // e.g. `export {a}` => [{id:'a', node:{...}}]
//     // e.g. `export default {a}` => [{id:'default', node:{...}}]
//   node:ASTNode     // the export node
// }

// interface Build {
//   pkgdir:string    // e.g. "/abs/path"
//   output:string    // e.g. "/abs/path.html"
//   template:string  // e.g. "/abs/path.html"
// }

// interface Program {
//   usedHelpers:string[]  // e.g. ['class-call-check', 'inherits', 'create-class']
//   ast:AST
//   map:SourceMap
//   code:string
// }

// interface ParseResult {
//   imports:ASTImportDeclaration[]
//   code:string
//   map:SourceMap
// }

class PkgCompiler {

  constructor(pkg:Pkg, mod:Module, target:Target) {
    this.pkg = pkg
    this.module = mod
    this.target = target
    this.log = this.target.log
    this._nextAnonID = 0;
  }

  // async compile(srcfiles:SrcFile[]):CodeBuffer
  async compile(srcfiles) {
    // load code and ast for each source file of the package
    await this.parseFiles(srcfiles)

    // Resolve inter-file dependencies (e.g. fileC -> fileA -> fileB)
    this.resolveInterFileDeps(srcfiles)

    // Sort srcfiles by symbol dependency
    srcfiles = this.sortFiles(srcfiles);

    // Log some details about inter-file deps
    if (this.log.level >= Logger.DEBUG) {
      this.log.debug(this.buildDepDescription(srcfiles));
    }

    // Code buffer we'll use to build module code
    var codebuf = new CodeBuffer;

    // Add header
    this.genHeader(srcfiles, codebuf);

    // Add source files
    for (let i = 0, L = srcfiles.length; i !== L; i++) {
      let srcfile = srcfiles[i];
      codebuf.addMappedCode(srcfile.parsed.code, srcfile.parsed.map);
    }

    // Add footer
    this.genFooter(srcfiles, codebuf);

    // console.log(codebuf.code);
    return codebuf;
  }


  // (srcfiles:SrcFile[], codebuf:CodeBuffer)
  genHeader(srcfiles, codebuf) {
    //  E.g.
    //    var _$0 = require('pkg1'), _$1 = require('pkg2');
    //    var file1$a = _$0, file1$b = _$0.B;
    //    var file2$c = _$1.c;

    // Contains a mapping from runtime helper ref => last import
    var runtimeImps = {};

    // Maps unique import refs to list of imports
    var importRefs = {};

    // Sort by unique refs, and separate runtime helpers
    for (let i = 0, L = srcfiles.length; i !== L; ++i) {
      let srcfile = srcfiles[i];
      let imports = srcfile.parsed.imports;
      for (let imp of imports) {
        if (imp.jo_isRuntimeHelper) {
          runtimeImps[imp.source.value] = imp;
        } else {
          imp.srcfile = srcfile;
          let impRefs = importRefs[imp.source.value];
          if (impRefs) {
            impRefs.push(imp);
          } else {
            importRefs[imp.source.value] = impRefs = [imp];
          }
        }
      }
    }


    // Gen pkginfo header
    var runtimeRefPrefixLen = 'babel-runtime/'.length;
    var pkginfo = {
      files:   this.pkg.files,
      imports: Object.keys(importRefs),
      exports: Object.keys(this.pkg.exports),
      'babel-runtime': Object.keys(runtimeImps).map(ref => {
        return ref.substr(runtimeRefPrefixLen);
      }),
      version: Date.now().toString(36),
    };
    if (this.pkg.hasMainFunc) {
      pkginfo.main = true;
    }
    this.pkg.pkgInfo = pkginfo;

    // Add any target header
    if (this.target.pkgModuleHeader) {
      let targetHeaderCode = this.target.pkgModuleHeader(this.pkg).trim();
      if (targetHeaderCode) {
        targetHeaderCode.split(/\r?\n/g).forEach(line => {
          codebuf.addLine(line);
        });
      }
    }

    // Add pkginfo
    codebuf.addLine('//#jopkg'+JSON.stringify(pkginfo));

    // Add imports
    if (Object.keys(runtimeImps).length !== 0 || Object.keys(importRefs).length !== 0) {
      // Add interop require
      codebuf.addLine(
        'var _$import = function(ref){ var m = require(ref); '+
        'return m && m.__esModule ? m["default"] : m; }'
      );

      // Add runtime helpers
      codebuf.addRuntimeImports(runtimeImps, Object.keys(importRefs).length===0);

      // Add regular imports and assign {ref: [name, name ...]} to pkg.imports
      this.pkg.imports = codebuf.addModuleImports(importRefs);
      // console.log('pkg.imports:', repr(this.pkg.imports,2));
    }
  }


  genFooter(srcfiles, codebuf) {
    // Add calls to any init() functions
    for (let srcfile of srcfiles) {
      if (srcfile.initFuncName) {
        codebuf.addLine(srcfile.initFuncName + '();');
      }
    }

    // Generate exports
    this.genExports(srcfiles, codebuf);

    // Add any target footer
    if (this.target.pkgModuleFooter) {
      let s = this.target.pkgModuleFooter(this.pkg).trim();
      if (s) {
        s.split(/\r?\n/g).forEach(line => {
          codebuf.addLine(line);
        });
      }
    }

    // Source map directive (must be last)
    if (this.module.file) {
      codebuf.addLine('//#sourceMappingURL='+path.basename(this.module.file)+'.map');
    }
  }


  // Returns { filename: [Export, ...], ...}
  exportsGroupedByFile(srcfiles) {
    var exports = {};
    for (let name in this.pkg.exports) {
      let exp = this.pkg.exports[name];
      let expv = exports[exp.file.name];
      if (!expv) {
        exports[exp.file.name] = [exp];
      } else {
        expv.push(exp);
      }
    }
    return exports;
  }


  genExports(srcfiles, codebuf) {
    var exportsByFile = this.exportsGroupedByFile(srcfiles);
    var exportFilenames = Object.keys(exportsByFile);
    if (exportFilenames.length === 0) {
      // nothing exported
      return;
    }

    // var lastFile = srcfiles[srcfiles.length-1];

    var t = babel.types;

    for (let filename in exportsByFile) {
      let exports = exportsByFile[filename];
      //let ast = { type: 'Program', body: [], comments: [], tokens: [] };
      let srcfile = exports[0].file;

      for (let exp of exports) {
        let ast = { type: 'Program', body: [], comments: [], tokens: [] };
        let memberExpr;

        if (exp.name === 'default') {
          // Generate `exports.__esModule = true`
          // Note: intentionally no srcloc
          codebuf.appendCode(
            this.codegen(
              t.expressionStatement(
                t.assignmentExpression(
                  '=',
                  t.memberExpression(t.identifier("exports"), t.identifier("__esModule")),
                  t.literal(true)
                )
              )
            )
          );
          // AST `exports["default"]`
          memberExpr = t.memberExpression(t.identifier("exports"), t.literal(exp.name), true);
        } else {
          // AST `exports.foo`
          memberExpr = t.memberExpression(t.identifier("exports"), t.identifier(exp.name));
        }

        // Generate `exports... = something`
        let assignmentExpr = t.assignmentExpression('=', memberExpr, exp.node);
        let code = this.codegen(t.expressionStatement(assignmentExpr));
        codebuf.appendCode(code, SrcLocation(exp.node, exp.file));
      }
    }
  }


  codegen(ast) {
    return BabelGen(ast, {
      code:              true,
      ast:               false,
      experimental:      true,     // enable things like ES7 features
      compact:           this.target.mode === TARGET_MODE_RELEASE,   // "minify"
      comments:          this.target.mode === TARGET_MODE_DEV,  // include comments in output
      returnUsedHelpers: false,    // return information on what helpers are needed/was added
    }).code;
  }


  // async parseFiles(srcfiles:SrcFile[])
  parseFiles(srcfiles) {
    return Promise.all(srcfiles.map(async (srcfile, index) => {
      srcfile.code = await fs.readFile(srcfile.dir + '/' + srcfile.name, 'utf8')
      srcfile.id = srcfile.name.replace(/[^a-z0-9_]/g, '_')
      try {
        //var [code, sourceMap] = this.preprocessFile(srcfile);
        var code = srcfile.code;
        var sourceMap = null;
        srcfile.parsed = this.parseFile(srcfile, code, sourceMap);
      } catch (err) {
        if (!err.srcfile) err.file = srcfile;
        throw err;
      }
    }))
  }


  preprocessFile(srcfile:SrcFile):[string,SourceMap] {
    var pp = new Preprocessor;
    return pp.process(srcfile);
  }


  // parseFile(srcfile:SrcFile, code:string, inSourceMap:SourceMap):ParseResult
  parseFile(srcfile, code, inSourceMap) {
    var bopts = {
      filename:          srcfile.name,
      inputSourceMap:    inSourceMap,
      sourceMap:         true,     // generate SourceMap
      sourceMapName:     'out.map',
      sourceRoot:        srcfile.dir,
      code:              true,     // output JavaScript code
      ast:               false,    // output AST
      experimental:      true,     // enable things like ES7 features
      compact:           this.target.mode === TARGET_MODE_RELEASE,   // "minify"
      comments:          this.target.mode === TARGET_MODE_DEV,  // include comments in output
      returnUsedHelpers: false,    // return information on what helpers are needed/was added
      modules:           'ignore',
      blacklist:         this.target.disabledTransforms(['es6.modules']),
      optional:          this.target.transforms([
        'jo.modules',  // must be first
        'runtime',
      ]).concat([
        'jo.classes',
        'jo.fileLocalVars', // must be last
      ]),
    };

    var T = babel.types;
    var bfile = new BabelFile(bopts);

    // sort transformers.
    //   Note: yeah, this is messed up. Internally Babel relies on object-literal key order
    //   of v8, so this code might break the day v8's internals changes.
    var tKeys = [for (t of bfile.transformerStack) t.transformer.key];
    var beforeIndex = tKeys.indexOf('utility.deadCodeElimination');
    if (beforeIndex === -1) {
      beforeIndex = tKeys.indexOf('_cleanUp');
    }
    var startKey = tKeys.indexOf('jo.modules');
    var endKey = tKeys.indexOf('jo.fileLocalVars');
    var joTransformers = bfile.transformerStack.splice(startKey, endKey-startKey+1);
    joTransformers.splice(0,0, beforeIndex, 0);
    bfile.transformerStack.splice.apply(bfile.transformerStack, joTransformers);

    // Place our class explorer transformer above the es6 class transformer
    tKeys = [for (t of bfile.transformerStack) t.transformer.key];
    var joClassTIndex = tKeys.indexOf('jo.classes');
    if (joClassTIndex !== -1) {
      var es6ClassTIndex = tKeys.indexOf('es6.classes');
      if (es6ClassTIndex !== -1 && joClassTIndex > es6ClassTIndex) {
        bfile.transformerStack.splice(
          es6ClassTIndex,
          0,
          bfile.transformerStack.splice(joClassTIndex,1)[0]
        );
      }
    }
    // console.log('transformers:', [for (t of bfile.transformerStack) t.transformer.key])

    bfile.jofile = srcfile;
    bfile.joFileIDName = '_' + srcfile.id;
    bfile.joFirstNonImportOffset = Infinity;
    bfile.joImports = []; // ImportDeclaration[]
    bfile.joPkg = this.pkg;
    bfile.joTarget = this.target;

    bfile.joAddImplicitImport = function(ref, specs, node=null) {
      // Adds the equivalent of `import name from "ref"`
      bfile.joImports.push({
        jo_isImplicitImport:true,
        source:{value:ref},
        loc: node ? node.loc : null,
        specifiers:Object.keys(specs).map(id => {
          return {
            id: {name:id},
            name: {name:specs[id]},
            srcfile: srcfile,
            'default': id === 'default'
          };
        }),
      });
    }

    bfile.joRegisterExport = function(name, node, isImplicitExport=false) {
      var errmsg, existingExport = bfile.joPkg.exports[name];
      if (existingExport) {
        errmsg = (name === 'default') ?
          'duplicate default export in package' :
          'duplicate exported symbol in package';
        throw ExportError(bfile.jofile, node, errmsg, null, [
          { message: 'also exported here',
            srcloc:  SrcLocation(existingExport.node, existingExport.file) }
        ])
      }
      if (name === 'default') {
        let prevExports = [], prevExportsLimit = 3;
        Object.keys(bfile.joPkg.exports).forEach(k => {
          var exp = bfile.joPkg.exports[k];
          if (!exp.isImplicit && prevExports.length < prevExportsLimit) {
            prevExports.push({
              message: 'specific export here',
              srcloc:  SrcLocation(exp.node, exp.file)
            });
          }
        })
        if (prevExports.length) {
          // case: "export default" after explicit "export x"
          throw ExportError(
            bfile.jofile,
            node,
            'default export mixed with specific export',
            null,
            prevExports
          );
        }
        // Overwrite any implicit exports
        bfile.joPkg.exports = {};
      } else {
        let defaultExp = bfile.joPkg.exports['default'];
        if (defaultExp) {
          if (isImplicitExport) {
            return; // simply ignore
          }
          throw ExportError(
            bfile.jofile,
            node,
            'specific export mixed with default export',
            null, [{
              message: 'default export here',
              srcloc:  SrcLocation(defaultExp.node, defaultExp.file)
            }]
          )
        }
      }

      bfile.joPkg.exports[name] = {
        name:name,
        file:bfile.jofile,
        node:node,
        isImplicit:isImplicitExport
      };
    };

    bfile.joRemappedIdentifiers = {};
    bfile.joLocalizeIdentifier = function (name) {
      // takes an identifier and registers it as "local" for this file, effectively
      // prefixing the id with that of the source file name.
      var newID = T.identifier(bfile.joFileIDName + '$' + name);
      this.joRemappedIdentifiers[name] = newID.name;
      return newID;
    };

    var res = bfile.parse(code);
    res.imports = bfile.joImports;
    // console.log('babel.transform:', res.code)
    // console.log('bfile.joImports:', bfile.joImports)

    return /*ParseResult*/res;
  }


  resolveInterFileDeps(srcfiles:SrcFile[]) {
    this._detectedDependencies = {}; // {srcfile.name: {file:srcfile.name, refNode:ASTNode}, ...}
    var pkg = this.pkg;

    // console.log([for (f of srcfiles)
    //   { file: f.name,
    //     unresolvedIDs: f.unresolvedIDs ? Object.keys(f.unresolvedIDs) : null,
    //     definedIDs: f.definedIDs ? Object.keys(f.definedIDs) : null
    //   } ]);

    // First pass: resolve symbols for each file with each other file. E.g. for A,B,C:
    //   test if A needs B
    //   test if A needs C
    //   test if B needs A
    //   test if B needs C
    //   test if C needs A
    //   test if C needs B
    //
    for (let x = 0; x !== srcfiles.length; x++) {
      for (let y = 0; y !== srcfiles.length; y++) {
        if (x !== y) {
          this._resolveFileDeps(srcfiles[x], srcfiles[y]);
        }
      }
    }

    // Check for unresolved IDs
    var errs = null;
    srcfiles.forEach(file => {
      if (file.unresolvedIDs && Object.keys(file.unresolvedIDs).length !== 0) {
        if (!errs) errs = [];
        for (let name of Object.keys(file.unresolvedIDs)) {
          errs.push({
            message: `unresolvable identifier "${name}"`,
            srcloc:  SrcLocation(file.unresolvedIDs[name].node, file)
          });
        }
      }
    });
    if (errs) {
      if (errs.length === 1) {
        throw SrcError('ReferenceError', errs[0].srcloc, errs[0].message);
      } else {
        throw SrcError('ReferenceError', null, 'unresolvable identifiers', null, errs);
      }
    }
  }


  buildDepDescription(srcfiles:SrcFile[]) {
    var intersectKeys = function(a, b) {
      return [for (k of Object.keys(a)) if (b[k]) k ];
    };

    let msg = this.log.style.boldGreen(this.pkg.id)+' inter-file dependencies:';
    let filenames = [for (f of srcfiles) if (this._detectedDependencies[f.name]) f.name];

    for (let filename of filenames) {
      let depnames = Unique(this._detectedDependencies[filename].map(d => d.file.name));
      msg += '\n  '+
        this.log.style.boldCyan(filename)+' depends on:';

      let refs = {};
      let dependeeFile = null;
      this._detectedDependencies[filename].forEach(dep => {
        if (!refs[dep.file.name]) { refs[dep.file.name] = {}; }
        for (let k in dep.file.definedIDs) {
          refs[dep.file.name][k] = {id:dep.file.definedIDs[k], file:dep.file};
        }
        if (!dependeeFile) {
          dependeeFile = dep.dependeeFile;
        }
      });

      for (let fn of Object.keys(refs)) {
        let ref = refs[fn];
        let ids = intersectKeys(ref, dependeeFile.resolvedIDs);

        msg += '\n    ' + this.log.style.boldYellow(fn);

        for (let id of ids) {
          let node = ref[id].id.node;
          if (node.type === 'FunctionDeclaration' || node.type === 'ClassExpression') {
            node = node.id;
          }
          let srcloc = SrcLocation(node, ref[id].file);
          let ln = '\n    ';
          msg += ln + srcloc.formatCode('boldYellow', 0, 0).join(ln);
        }
      }
    }
    return msg
  }


  fileDependsOn(fileA, fileB) {
    var dep = this._detectedDependencies[fileA.name];
    if (dep && dep.some(o => o.file === fileB)) {
      return dep;
    }
  };


  fileDependsOnClasses(fileA, fileB) {
    var dep = this._detectedDependencies[fileA.name];
    // if (dep) {
    //   console.log('fileDependsOnClasses: dep:');
    //   for (let o of dep) {
    //     console.log('  ' + o.file.name);
    //   }
    // }
    if (dep && dep.some(o => o.file === fileB && o.defNode.type === 'ClassExpression')) {
      return dep;
    }
  };


  _resolveFileDeps(fileA, fileB) {
    // console.log('_resolveFileDeps:', fileA.name, '=>', fileB.name);
    if (!fileA.unresolvedIDs || !fileB.definedIDs) {
      return;
    }

    for (let name of Object.keys(fileA.unresolvedIDs)) {
      let definition = fileB.definedIDs[name];
      if (definition) {
        let classRef = fileA.unresolvedSuperclassIDs ? fileA.unresolvedSuperclassIDs[name] : null;

        // Has inverse class dependency? (i.e. cyclic)
        let deps;
        if ( classRef && (deps = this.fileDependsOnClasses(fileB, fileA)) ) {
          throw CyclicReferenceError(this.pkg, name, fileA, fileB, deps, /*onlyClasses=*/true);
        }

        // Register dependency
        let fileDeps = this._detectedDependencies[fileA.name];
        if (!fileDeps) {
          this._detectedDependencies[fileA.name] = fileDeps = [];
        }
        fileDeps.push({
          // This is only used for error reporting, which is why we "return" later on
          // here, not storing all names (but just the first we find) for this dependency.
          dependeeFile:fileA,
          file:fileB,
          name:name,
          defNode:definition.node,
          refNode:fileA.unresolvedIDs[name].node,
        });

        // Remove resolved name from list of unresolved IDs
        if (!fileA.resolvedIDs) { fileA.resolvedIDs = {}; }
        fileA.resolvedIDs[name] = fileA.unresolvedIDs[name];
        if (Object.keys(fileA.unresolvedIDs).length === 1) {
          fileA.unresolvedIDs = null;
        } else {
          delete fileA.unresolvedIDs[name];
        }
      }
    }
  }


  // Sorts files in-place based on fileDependsOn(A,B)
  sortFiles(srcfiles:SrcFile[]):SrcFile[] {
    // console.log('srcfiles (before sorting):', [for (f of srcfiles) f.name])

    // Now sort by dependencies
    srcfiles = srcfiles.slice();
    srcfiles.sort((fileA, fileB) => {
      if (fileA.unresolvedSuperclassIDs || fileB.unresolvedSuperclassIDs) {
        // Either or both files have class dependencies across other files, so order
        // based on class hierarchy.

        // Does fileB provide any reference that fileA needs?
        if (this.fileDependsOnClasses(fileA, fileB)) {
          return 1; // fileA comes before fileB
        }

        // Does fileA provide any reference that fileB needs?
        if (this.fileDependsOnClasses(fileB, fileA)) {
          return -1; // fileA comes before fileB
        }
      }

      if (this.fileDependsOn(fileA, fileB)) {
        return 1; // fileA comes before fileB
      }

      if (this.fileDependsOn(fileB, fileA)) {
        return -1; // fileA comes before fileB
      }

      // No difference
      return 0;
    });

    // console.log('srcfiles (after sorting):', [for (f of srcfiles) f.name]);

    // Now sort topographically
    var ts = [];
    var NONE = {name:'NONE'};
    for (let fileA of srcfiles) {
      var deps = this._detectedDependencies[fileA.name];
      if (deps && deps.length !== 0) {
        for (let dep of deps) {
          ts.push([fileA, dep.file]);
        }
      } else {
        ts.push([fileA, NONE]);
      }
    }
    srcfiles = toposort(ts).filter(f => f !== NONE).reverse();

    //console.log('srcfiles (after toposort):', [for (f of srcfiles) f.name]);

    return srcfiles;
  }


}

