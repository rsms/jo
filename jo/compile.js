"use strict";
var recast = require('recast');
var B = recast.types.builders;

import {JSIdentifier, SrcError, SrcLocation, repr} from './util'

import * as babel from 'babel'
import BabelFile from 'babel/lib/babel/transformation/file';
import Transformer from 'babel/lib/babel/transformation/transformer'
import { ModuleTransformer, FileLocalVarsTransformer } from './transformers'

// Register jo transformers (wish there was a non-mutating API for this)
babel.transform.transformers['jo.modules'] =
  new Transformer('jo.modules', ModuleTransformer);
babel.transform.transformers['jo.fileLocalVars'] =
  new Transformer('jo.fileLocalVars', FileLocalVarsTransformer);

function ExportError(file, node, message, fixSuggestion, related) {
  return SrcError('ExportError', SrcLocation(node, file), message, fixSuggestion, related);
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

  // (pkg:Pkg, target:Target)
  constructor(pkg, target) {
    this.pkg = pkg
    this.target = target
    this._nextAnonID = 0;
  }

  // async compile(srcfiles:SrcFile[]):CodeBuffer
  async compile(srcfiles) {
    // load code and ast for each source file of the package
    var parsed = await this.parseFiles(srcfiles)

    // Code buffer
    var codebuf = new CodeBuffer;

    // Add header
    // console.log('fileImports:', repr(imports))
    this.genHeader(srcfiles, parsed, codebuf);
    // console.log('genImportsHeader:', codebuf.code);

    // Add source files
    // TODO: sort by class hierarchy
    for (let i = 0, L = parsed.length; i !== L; i++) {
      let parseRes = parsed[i];
      // let srcfile = srcfiles[i];
      codebuf.addMappedCode(parseRes.code, parseRes.map);
    }

    console.log(codebuf.code);
    return codebuf;
  }


  // (srcfiles:SrcFile[], parsed:ParseResult[], codebuf:CodeBuffer)
  genHeader(srcfiles, parsed, codebuf) {
    //  E.g.
    //    var _$0 = require('pkg1'), _$1 = require('pkg2');
    //    var file1$a = _$0, file1$b = _$0.B;
    //    var file2$c = _$1.c;

    // Contains a mapping from runtime helper ref => last import
    var runtimeImps = {};

    // Maps unique import refs to list of imports
    var importRefs = {};

    // Sort by unique refs, and separate runtime helpers
    for (let i = 0, L = parsed.length; i !== L; ++i) {
      let srcfile = srcfiles[i];
      let imports = parsed[i].imports;
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


    // Add pkginfo header
    var runtimeRefPrefixLen = 'babel-runtime/'.length;
    var pkginfo = {
      files:   this.pkg.files,
      imports: Object.keys(importRefs),
      exports: Object.keys(this.pkg.exports),
      'babel-runtime': Object.keys(runtimeImps).map(ref => {
        return ref.substr(runtimeRefPrefixLen);
      }),
    };
    codebuf.addLine('//#jopkg'+JSON.stringify(pkginfo));
    codebuf.addLine('//#sourceMappingURL=index.js.map');

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
      console.log('pkg.imports:', repr(this.pkg.imports,2));
    }
  }


  // async parseFiles(srcfiles:SrcFile[]):ParseResult[]
  parseFiles(srcfiles) {
    return Promise.all(srcfiles.map(async (srcfile, index) => {
      srcfile.code = await fs.readFile(srcfile.dir + '/' + srcfile.name, 'utf8')
      srcfile.id = srcfile.name.replace(/[^a-z0-9_]/g, '_')
      try {
        return this.parseFile(srcfile, /*isLastFile=*/index === srcfiles.length-1);
        // srcfile.ast = recast.parse(source, {sourceFileName: srcfile.relpath, range: true })
        // this.transformJS(srcfile)
      } catch (err) {
        if (!err.srcfile) err.file = srcfile;
        throw err;
      }
    }))
  }


  // parseFile(srcfile:SrcFile, isLastFile:bool):ParseResult
  parseFile(srcfile, isLastFile) {
    var bopts = {
      filename:          srcfile.name,
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
        // Transformers suggested for the target
        'jo.modules',
        'runtime',
        'utility.inlineEnvironmentVariables'
      ]).concat([
        // Required transformers
        'jo.fileLocalVars',
      ]),
    };

    var T = babel.types;
    var bfile = new BabelFile(bopts);
    bfile.jofile = srcfile;
    bfile.joFileIDName = '_' + srcfile.id;
    bfile.joFirstNonImportOffset = Infinity;
    bfile.joImports = []; // ImportDeclaration[]
    bfile.joIsLastFile = isLastFile;
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
      bfile.joPkg.exports[name] = {file:bfile.jofile, node:node, isImplicit:isImplicitExport};
    };

    bfile.joRemappedIdentifiers = {};
    bfile.joLocalizeIdentifier = function (name) {
      // takes an identifier and registers it as "local" for this file, effectively
      // prefixing the id with that of the source file name.
      var newID = T.identifier(bfile.joFileIDName + '$' + name);
      this.joRemappedIdentifiers[name] = newID.name;
      return newID;
    };

    var res = bfile.parse(srcfile.code);
    res.imports = bfile.joImports;
    // console.log('babel.transform:', res.code)
    // console.log('bfile.joImports:', bfile.joImports)

    return /*ParseResult*/res;
  }


}

