import fs from 'asyncfs'
import path from 'path'
import * as babel from 'npmjs.com/babel-core'
//import BabelFile from 'npmjs.com/babel/lib/babel/transformation/file';
// import Transformer from 'npmjs.com/babel/lib/babel/transformation/transformer'
// import BabelGen from 'npmjs.com/babel/lib/babel/generation'
import plugins from './transformers'
// {
//   ModulePlugIn,
//   FileLocalVarsTransformer,
//   ClassHierarchyTransformer
// } from 
import {
  JSIdentifier,
  SrcError,
  SrcErrors,
  RefError,
  ExportError,
  CyclicRefError,
  SrcLocation,
  repr,
  Unique,
  LevenshteinDistance,
  TermStyle,
} from './util'

// Register jo transformers (wish there was a non-mutating API for this)
// babel.transform.transformers['jo.classes'] =
//   new Transformer('jo.classes', ClassHierarchyTransformer);
// babel.transform.transformers['jo.modules'] =
//   new Transformer('jo.modules', ModuleTransformer);
// babel.transform.transformers['jo.fileLocalVars'] =
//   new Transformer('jo.fileLocalVars', FileLocalVarsTransformer);




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

  constructor(pkg:Pkg, mod:Module, target:Target, depLevel:int) {
    this.pkg = pkg
    this.module = mod
    this.target = target
    this.log = this.target.log
    this.depLevel = depLevel;
    this._nextAnonID = 0;
  }

  // async compile(srcfiles:SrcFile[]):CodeBuffer
  async compile(srcfiles) {
    // load code and ast for each source file of the package
    await this.parseFiles(srcfiles)

    // Resolve cross-file dependencies (e.g. fileC -> fileA -> fileB)
    this.resolveCrossFileDeps(srcfiles)

    // Sort srcfiles by symbol dependency
    srcfiles = this.sortFiles(srcfiles);

    // Log some details about inter-file deps
    if (this.log.level >= Logger.DEBUG) {
      this.log.debug(this.buildDepDescription(srcfiles));
    }

    // Code buffer we'll use to build module code
    var codebuf = new CodeBuffer(path.resolve(this.pkg.dir), this.target);

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


  groupedImports(srcfiles:SrcFile[]) { //:[runtimeImps:{ref=Imp},importRefs:{ref=Imp[]}]
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

    return [runtimeImps, importRefs]
  }


  genPkgInfo(runtimeImps, importRefs) {
    // Gen pkginfo header
    var runtimeRefPrefixLen = 'babel-runtime/'.length;
    var runtimeRefs = Object.keys(runtimeImps).map(ref => ref.substr(runtimeRefPrefixLen) );
    return {
      files:     this.pkg.files,
      imports:   Object.keys(importRefs),
      importsrt: runtimeRefs,
      exports:   Object.keys(this.pkg.exports),
      implv:     Date.now().toString(36), // FIXME: code content hash?
      apiv:      Date.now().toString(36), // FIXME: API hash?
      main:      this.pkg.hasMainFunc,
    };
  }


  genHeader(srcfiles:SrcFile[], codebuf:CodeBuffer) {
    //  E.g.
    //    var _$0 = require('pkg1'), _$1 = require('pkg2');
    //    var file1$a = _$0, file1$b = _$0.B;
    //    var file2$c = _$1.c;

    // Unique and separate runtime and import refs
    var [runtimeImps, importRefs] = this.groupedImports(srcfiles)

    // Generate pkginfo
    this.pkg.pkgInfo = this.genPkgInfo(runtimeImps, importRefs);

    // Allow target to add any code to the header at this point
    if (this.target.pkgModuleHeader) {
      let targetHeaderCode = this.target.pkgModuleHeader(this.pkg, this.depLevel);
      if (targetHeaderCode) {
        targetHeaderCode.trim().split(/\r?\n/g).forEach(line => {
          codebuf.appendLine(line);
        });
      }
    }

    // Add pkginfo line
    codebuf.appendLine('//#jopkg'+JSON.stringify(this.pkg.pkgInfo));

    // Add imports
    if (Object.keys(runtimeImps).length !== 0 || Object.keys(importRefs).length !== 0) {
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
        codebuf.appendLine(srcfile.initFuncName + '();');
      }
    }

    // Generate exports
    this.genExports(srcfiles, codebuf);

    // Add any target footer
    if (this.target.pkgModuleFooter) {
      let s = this.target.pkgModuleFooter(this.pkg, this.depLevel);
      if (s) {
        s.trim().split(/\r?\n/g).forEach(line => {
          codebuf.appendLine(line);
        });
      }
    }

    // Source map directive (must be last)
    if (this.module.file) {
      codebuf.appendLine('//#sourceMappingURL='+path.basename(this.module.file)+'.map');
    }
  }


  genExports(srcfiles:SrcFile[], codebuf:CodeBuffer) {
    // Exports for this package sorted by name so that generated code changes as little as possible
    let codegen = this.codegen.bind(this);
    Object.keys(this.pkg.exports).sort().forEach(name => {
      codebuf.appendExport(this.pkg.exports[name], codegen)
    })
  }


  codegen(program:ASTProgram) {
    return babel.transform.fromAst(program, null, this.basicBabelOptions).code;
  }


  // async parseFiles(srcfiles:SrcFile[])
  parseFiles(srcfiles) {
    return Promise.all(srcfiles.map(async (srcfile, index) => {
      srcfile.code = await fs.readFile(srcfile.dir + '/' + srcfile.name, 'utf8')
      srcfile.id   = srcfile.name.replace(/[^a-z0-9_]/g, '_')
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


  preprocessFile(srcfile:SrcFile) { //:[string,SourceMap]
    var pp = new Preprocessor;
    return pp.process(srcfile);
  }


  // parseFile(srcfile:SrcFile, code:string, inSourceMap:SourceMap):ParseResult
  parseFile(srcfile, code, inSourceMap) {
    this.log.debug('parse', this.pkg.id + '/' + srcfile.name);

    // Babel options (http://babeljs.io/docs/usage/options/)
    // [LIMITATION] Babel can only read options that are ownProperties of the option object,
    // meaning we can't use prototypal inheritance -- we must provide all options as own props.
    var babelOptions = Object.assign({

      filename:            srcfile.name,
      inputSourceMap:      inSourceMap,
      sourceMaps:          true,     // generate SourceMap
      sourceMapTarget:     'out.map',
      sourceRoot:          srcfile.dir,

      plugins: [
        { transformer: plugins.Modules, position: 'before' }, // must be first
        { transformer: plugins.Classes, position: 'before' },
        { transformer: plugins.FileScope, position: 'after' }, // must be last
      ],

      // resolveModuleSource: (source, filename) => {
      //   // gets ref e.g. "foo" from `import "foo"`. The valuer returned is used in-place
      //   // of "foo".
      //   console.log('TRACE resolveModuleSource', source, filename);
      //   return source;
      // },
    }, this.basicBabelOptions);

    // Make sure there are no "optional" transformers which are blacklisted
    babelOptions.optional = babelOptions.optional.filter(transformerID =>
      babelOptions.blacklist.indexOf(transformerID) === -1 )

    var ctx = new CompileContext(this.pkg, srcfile, this.target, this.log);
    babelOptions._joctx = ctx;
    babelOptions._jofile = srcfile;

    // Transform
    // console.log('babel options', repr(babelOptions));
    var res = babel.transform(code, babelOptions);
    res.imports = ctx.imports;
    // console.log('srcfile.definedIDs:', repr(srcfile.definedIDs,0))
    // console.log('res.code:', res.code);
    // console.log('res.imports:', repr(res.imports,1));
    // console.log('pkg.exports:', repr(this.pkg.exports,1))
    return res;
  }


  get basicBabelOptions() {
    var options = {
      code:                true,     // output JavaScript code
      ast:                 false,    // output AST
      compact:             this.target.mode === TARGET_MODE_RELEASE,   // "minify"
                                 //^ [BUG] true: broken in babel 4.7.16 (concats "yield" and "new")
      comments:            this.target.mode === TARGET_MODE_DEV,  // include comments in output
      metadataUsedHelpers: false,    // return information on what helpers are needed/was added
      modules:             'ignore',
      externalHelpers:     true,
      experimental:        true,
      stage:               0, // 0=strawman 1=proposal 2=draft 3=candidate 4=finished. TODO config
      nonStandard:         true, // Enable support for JSX and Flow

      // See http://babeljs.io/docs/advanced/transformers/
      blacklist: this.target.disabledTransforms([
        'es6.modules',
        'validation.react',
        'validation.undeclaredVariableCheck',
        'utility.inlineEnvironmentVariables', // we do this ourselves
        'reactCompat',
        'strict', // just puts `"use strict"` in every source
        'jscript',
      ]),

      optional: this.target.transforms([
        'runtime',
        'es6.spec.blockScoping',
        'es6.spec.symbols',
        'es6.spec.templateLiterals',
        'react',
        'flow',
      ]),
    };

    if (__DEV__) {
      Object.freeze(options)
      Object.freeze(options.blacklist);
      Object.freeze(options.optional);
    }

    Object.defineProperty(this, 'basicBabelOptions', {value:options})
    return options;
  }


  resolveCrossFileDeps(srcfiles:SrcFile[]) {
    this._detectedDependencies = {}; // {srcfile.name: {file:srcfile.name, refNode:ASTNode}, ...}
    var pkg = this.pkg;

    this.log.debug('resolving cross-file dependencies');

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
    var errs = [];
    srcfiles.forEach(file => {
      if (file.unresolvedIDs && Object.keys(file.unresolvedIDs).length !== 0) {
        for (let name of Object.keys(file.unresolvedIDs)) {
          let node = file.unresolvedIDs[name].node;
          if (!node.loc) {
            // Generated by Babel
            continue;
          }
          let err = RefError(file, node, `unresolvable identifier "${name}"`);
          let suggestions = this.findIDSuggestions(srcfiles, name);
          if (suggestions.length !== 0) {
            err.suggestion = this.formatIDSuggestions(suggestions);
          }
          errs.push(err);
        }
      }
    });
    if (errs.length !== 0) {
      throw SrcErrors(errs);
    }
  }


  findIDSuggestions(srcfiles:SrcFile[], name:string, depth=0) {
    var sv = [];
    var km = {};
    var nameLowerCase = name.toLowerCase();
    for (let srcfile of srcfiles) {
      let foundCloseMatch = false;
      for (let k in srcfile.definedIDs) {
        let binding = srcfile.definedIDs[k];
        if (binding.kind === 'module' || binding.kind === 'uid' || !binding.identifier.loc) {
          continue;
        }
        let d = 0;
        if (nameLowerCase === k.toLowerCase()) {
          foundCloseMatch = true;
        } else {
          d = LevenshteinDistance(name, k);
        }
        if (d <= 2 && !km[k]) {
          sv.push(km[k] = {d:d, name:k, srcloc: SrcLocation(binding.node, srcfile)});
        }
      }
      // Attempt built-in modules
      if (!foundCloseMatch) {
        // TODO: include known modules, not just the built-in ones
        for (let k in this.target.builtInModuleRefs) {
          if (!km[k] && k.toLowerCase() === nameLowerCase) {
            sv.push(km[k] = {d:0, name:k, isModule:true});
          }
        }
      }
    }
    // sort from shortest edit distance to longest
    return sv.sort((a,b) => a.d - b.d);
  }


  formatIDSuggestions(suggestions) {
    return 'Did you mean' + (suggestions.length > 1 ? ':\n  ' : ' ') +
      suggestions.map(s => {
        if (s.isModule) {
          return 'built-in module "' + TermStyle.stdout.boldCyan(s.name) + '"'
        } else {
          return TermStyle.stdout.boldCyan(s.name) + ' defined in ' +
                 s.srcloc.formatFilename('green')
        }
      }).join('\n  ');
  }


  buildDepDescription(srcfiles:SrcFile[]) {
    // Note: Does NOT mutate srcfiles, but does read internal state
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

        for (let name of ids) {
          let r = ref[name];
          let srcloc = SrcLocation(r.id.identifier, r.file);
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
    var deps = this._detectedDependencies[fileA.name];
    if (deps) {
      // console.log('fileDependsOnClasses: '+fileA.name+' dependencies:');
      // deps.forEach(dep => {
      //   console.log('  file.name:                  ' + repr(dep.file.name));
      //   console.log('  binding.identifier.name:    ' + repr(dep.binding.identifier.name,1));
      //   console.log('  binding.kind:               ' + repr(dep.binding.kind,1));
      //   console.log('  binding.isClassDeclaration: ' + repr(dep.binding.isClassDeclaration,1));
      // })
      for (let k in deps) {
        if (deps[k].file === fileB && deps[k].binding.isClassDeclaration) {
          return deps;
        }
      }
    }
    return null;
  };


  _resolveFileDeps(fileA, fileB) {
    // console.log('_resolveFileDeps:', fileA.name, '=>', fileB.name);
    if (!fileA.unresolvedIDs || !fileB.definedIDs) {
      return;
    }

    let unresolved = Object.keys(fileA.unresolvedIDs);
    let resolved = unresolved.filter(name =>
      this._resolveIdentifierAcrossFiles(name, fileA, fileB))

    // Remove any names that were resolved from `fileA.unresolvedIDs`
    if (resolved.length === unresolved.length) {
      fileA.unresolvedIDs = null;
    } else {
      resolved.forEach(name => { delete fileA.unresolvedIDs[name] })
    }
  }


  _resolveIdentifierAcrossFiles(name:string, file:SrcFile, otherFile:SrcFile) {
    let binding = otherFile.definedIDs[name];
    if (!binding) {
      return false; // `name` was not resolved
    }

    if (this.log.level >= Logger.DEBUG) {
      let kind =
        (file.unresolvedSuperclassIDs && file.unresolvedSuperclassIDs[name]) ? 'class' :
        (binding.kind === 'hoisted' &&
         (!binding.node || binding.node.type === 'FunctionDeclaration'))     ? 'function' :
                                                                             binding.kind;
      this.log.debug(
        `resolved reference ${name} in ${file.name} to ${kind} ${name} in ${otherFile.name}`
      )
    }

    // `name` refers to a (super)class?
    let classRef = file.unresolvedSuperclassIDs ? file.unresolvedSuperclassIDs[name] : null;
    if (classRef) {
      // Check for inverse class dependency (i.e. cyclic)
      let classDeps = this.fileDependsOnClasses(otherFile, file);
      if (classDeps) {
        throw CyclicRefError(this.pkg, name, file, otherFile, classDeps, /*onlyClasses=*/true);
      }
      delete file.unresolvedSuperclassIDs[name];
    }

    // Register file-to-file dependency
    let fileDeps = this._detectedDependencies[file.name] ||
                   (this._detectedDependencies[file.name] = []);
    fileDeps.push({
      dependeeFile: file,
      file:         otherFile,
      name:         name,
      binding:      binding,
      refNode:      file.unresolvedIDs[name].node,
    });

    if (!file.resolvedIDs) { file.resolvedIDs = {}; }
    file.resolvedIDs[name] = file.unresolvedIDs[name];

    return true; // `name` was resolved
  }


  // Sorts files in-place based on fileDependsOn(A,B)
  sortFiles(srcfiles:SrcFile[]) { //:SrcFile[]
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

