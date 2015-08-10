import fs from 'asyncfs'
import path from 'path'
import babel from 'npmjs.com/babel-core'
import plugins from './transformers'
import 'assert'
import 'tsort'
import {
  SrcErrors,
  RefError,
  CyclicRefError,
  SrcLocation,
  Unique,
  LevenshteinDistance,
} from './util'
import 'term'

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

type ParseResult = {
  imports:ASTImportDeclaration[];
  code:string;
  map:SourceMap;
};

type ModuleBasedOn = {
  module:Module;
  srcfiles:SrcFile[];
};


class ModuleCompiler {

  constructor(pkg:Pkg, module:Module, basedOn?:ModuleBasedOn, target:Target, depLevel:int) {
    this.pkg = pkg
    this.module = module
    this.basedOn = basedOn
    this.target = target
    this.log = this.target.log
    this.depLevel = depLevel
    this._nextAnonID = 0;
  }


  async compile(srcfiles:SrcFile[]) { //:CodeBuffer
    // load code and ast for each source file of the package
    await this.parseFiles(srcfiles)

    // Resolve cross-file dependencies (e.g. fileC -> fileA -> fileB)
    let depGraph = this.resolveCrossFileDeps(srcfiles)

    // Sort srcfiles by symbol dependencies
    srcfiles = this.sortFiles(srcfiles, depGraph);

    // Log some details about inter-file deps
    if (this.log.level >= Logger.DEBUG) {
      let [msg, filenames] = this.buildDepDescription(srcfiles);
      if (filenames.length !== 0) {
        this.log.debug(msg);
      }
    }

    // Run target.preCompileModule
    this.target.preCompileModule(this.pkg, this.module, srcfiles, this.depLevel)

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

    // Note: target.postCompileModule runs from BuildCtx.compileModule

    return codebuf;
  }


  importsForSrcFiles(srcfiles:SrcFile[]) { //:{ref=>Imp[]}
    // Maps unique import refs to list of imports
    var importRefs = {};

    // Sort by unique refs, and separate runtime helpers
    for (let srcfile of srcfiles) {
      for (let imp of srcfile.parsed.imports) {
        imp.srcfile = srcfile;
        let impRefs = importRefs[imp.source.value];
        if (impRefs) {
          impRefs.push(imp);
        } else {
          importRefs[imp.source.value] = [imp];
        }
      }
    }

    return importRefs;
  }


  genHeader(srcfiles:SrcFile[], codebuf:CodeBuffer) {
    //  E.g.
    //    var _$0 = require('pkg1'), _$1 = require('pkg2');
    //    var file1$a = _$0, file1$b = _$0.B;
    //    var file2$c = _$1.c;

    // Unique and separate runtime and import refs
    var importRefs = this.importsForSrcFiles(srcfiles);

    // Add testing to test modules w/o explicit import
    if (this.module instanceof TestModule && !importRefs['testing']) {
      importRefs['testing'] = [ mkimport({ref: 'testing', specs: {}, isImplicit: true}) ];
    }

    // Generate info and add pkg header
    this.module.info = this.module.makeInfo(srcfiles, importRefs);
    codebuf.appendLine('//#jopkg'+JSON.stringify(this.module.info));

    // Allow target to add any code to the header at this point
    if (this.target.pkgModuleHeader) {
      let targetHeaderCode = this.target.pkgModuleHeader(this.pkg, this.module, this.depLevel);
      if (targetHeaderCode) {
        targetHeaderCode.trim().split(/\r?\n/g).forEach(line => {
          codebuf.appendLine(line);
        });
      }
    }

    // Add imports
    if (Object.keys(importRefs).length !== 0) {
      // Add regular imports and assign {ref: [name, name ...]} to pkg.imports
      let imports = codebuf.addModuleImports(importRefs);
      if (this.module === this.pkg.module) {
        // So that we don't set imports from pkg.testModule
        this.pkg.imports = imports;
      }
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
      let s = this.target.pkgModuleFooter(this.pkg, this.module, this.depLevel);
      if (s) {
        s.trim().split(/\r?\n/g).forEach(line => {
          codebuf.appendLine(line);
        });
      }
    }

    // Source map directive (must be last)
    if (this.module.filename) {
      codebuf.appendLine('//#sourceMappingURL='+path.basename(this.module.filename)+'.map');
    }
  }


  genExports(srcfiles:SrcFile[], codebuf:CodeBuffer) {
    // Exports for this package sorted by name so that generated code changes as little as possible
    let codegen = this.codegen.bind(this);
    let asTest = (this.module instanceof TestModule);
    if (__DEV__) { var seenExports = new Set; }
    srcfiles.forEach(f => {
      if (f.exports) {
        for (let [k, exp] of f.exports) {
          if (__DEV__) { assert(!seenExports.has(k)); seenExports.add(k); }
          codebuf.appendExport(exp, codegen, asTest);
        }
      }
    })
  }


  codegen(program:ASTProgram) {
    let opts = Object.assign({}, this.basicBabelOptions); // b/c babel mutates the object(!)
    return babel.transform.fromAst(program, null, opts).code;
  }


  // async parseFiles(srcfiles:SrcFile[])
  parseFiles(srcfiles) {
    return Promise.all(srcfiles.map(async (srcfile, index) => {
      srcfile.code = await fs.readFile(srcfile.dir + '/' + srcfile.name, 'utf8')
      srcfile.id   = srcfile.name.replace(/[^a-z0-9_]/g, '_')
      try {
        var code = srcfile.code;
        var sourceMap = null;
        srcfile.parsed = this.parseFile(srcfile, code, sourceMap);
      } catch (err) {
        if (!err.srcfile) err.file = srcfile;
        throw err;
      }
    }))
  }


  parseFile(srcfile:SrcFile, code:string, inSourceMap:SourceMap) { //:ParseResult
    this.log.debug('parse', this.pkg.id + '/' + srcfile.name);
    // Babel options (http://babeljs.io/docs/usage/options/)
    // [LIMITATION] Babel can only read options that are ownProperties of the option object,
    // meaning we can't use prototypal inheritance -- we must provide all options as own props.
    var babelOptions = Object.assign({

      filename:            srcfile.name,
      inputSourceMap:      inSourceMap,
      sourceMaps:          true,     // generate SourceMap
      // sourceMapTarget:     'out.map',
      sourceRoot:          srcfile.dir,

      plugins: [
        { transformer: plugins.Init, position: 'before' }, // must be first
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

    var ctx = new CompileContext(this.pkg, this.module, srcfile, this.target, this.log);
    babelOptions._joctx = ctx;
    babelOptions._jofile = srcfile;

    // Transform
    // console.log('babel options', repr(babelOptions));
    var res = babel.transform(code, babelOptions);
    res.imports = ctx.imports;

    // if (srcfile.name === 'main.js') {
    //   console.log('srcfile.definedIDs:', repr(srcfile.definedIDs,0))
    //   console.log('input code:', code);
    //   console.log('res.code:', res.code);
    //   console.log('res.imports:', repr(res.imports,1));
    //   console.log('module.exports:', repr(this.module.exports,1))
    //   console.log('metadata:', repr(res.metadata,5))
    //   process.exit(3);
    // }

    return res;
  }


  get basicBabelOptions() {
    var options = {
      code:                true,     // output JavaScript code
      ast:                 false,    // output AST
      compact:             this.target.mode === TARGET_MODE_RELEASE,   // "minify"
                                 //^ [BUG] true: broken in babel 4.7.16 (concats "yield" and "new")
      comments:            this.target.mode === TARGET_MODE_DEV,  // include comments in output
      externalHelpers:     true,
      // metadataUsedHelpers: true,    // return information on what helpers are needed/was added
      modules:             'ignore',
      experimental:        true,
      stage:               0, // 0=strawman 1=proposal 2=draft 3=candidate 4=finished. TODO config
      nonStandard:         true, // Enable support for JSX and Flow
      loose:               [],  // disallows import/exports beyond head and return at root

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


  resolveCrossFileDeps(srcfiles:SrcFile[]) { // :tsort.DAG
    this._detectedDependencies = {}; // {srcfile.name: {file:srcfile.name, refNode:ASTNode}, ...}
    var pkg = this.pkg;

    this.log.debug('resolving cross-file dependencies');

    var depGraph = new tsort.DAG;

    // console.log([for (f of srcfiles)
    //   { file: f.name,
    //     unresolvedIDs: f.unresolvedIDs ? Object.keys(f.unresolvedIDs) : null,
    //     definedIDs: f.definedIDs ? Object.keys(f.definedIDs) : null
    //   } ]);

    // Resolve symbols for each file with each other file. E.g. for A,B,C:
    //   test if A needs B
    //   test if A needs C
    //   test if B needs A
    //   test if B needs C
    //   test if C needs A
    //   test if C needs B
    //
    let failedFiles = null; //SrcFile[]
    for (let x = 0; x !== srcfiles.length; x++) {
      let fileA = srcfiles[x];
      if (fileA.unresolvedIDs) {
        // console.log('attempt resolve', fileA.name, Object.keys(fileA.unresolvedIDs))
        let isResolved = this._resolveFileDepsv(fileA, srcfiles, depGraph);
        if (!isResolved && this.basedOn) {
          // attempt resolving with basedOn.srcfiles
          isResolved = this._resolveFileDepsv(fileA, this.basedOn.srcfiles, depGraph);
        }
        if (!isResolved) {
          if (__DEV__) { assert(fileA.unresolvedIDs); }
          if (failedFiles) {
            failedFiles.push(fileA);
          } else {
            failedFiles = [fileA];
          }
        }
      }
    }

    if (failedFiles) {
      let errs = this._makeUnresolvableIDErrors(failedFiles);
      assert(errs.length !== 0);
      throw SrcErrors(errs);
    }

    return depGraph;
  }


  _resolveFileDepsv(fileA:SrcFile, srcfiles:SrcFile[], depGraph:DAG) { //:bool -- resolved all?
    for (let y = 0; y !== srcfiles.length; y++) {
      let fileB = srcfiles[y];
      if (fileA !== fileB && fileB.definedIDs) {
        if (this._resolveFileDeps(fileA, fileB, depGraph)) {
          return true;
        }
      }
    }
    return false;
  }


  _resolveFileDeps(fileA, fileB, depGraph:DAG) { //:bool -- resolved all?
    // console.log('_resolveFileDeps:', fileA.name, '=>', fileB.name);
    let unresolved = Object.keys(fileA.unresolvedIDs);
    let resolved = unresolved.filter(name =>
      this._resolveIdentifierAcrossFiles(name, fileA, fileB, depGraph))

    // Remove any names that were resolved from `fileA.unresolvedIDs`
    if (resolved.length === unresolved.length) {
      fileA.unresolvedIDs = null;
      return true;
    } else {
      resolved.forEach(name => { delete fileA.unresolvedIDs[name] })
      // console.log('_resolveFileDeps: failed to resolve:', fileA.unresolvedIDs,
      //             '(did resolve:', resolved, ')');
      return false;
    }
  }


  _makeUnresolvableIDErrors(srcfiles:SrcFile[]) {
    var errs = [];
    srcfiles.forEach(file => {
      if (__DEV__) {
        assert(file.unresolvedIDs);
        assert(Object.keys(file.unresolvedIDs).length !== 0);
      }
      for (let name in file.unresolvedIDs) {
        let node = file.unresolvedIDs[name].node;
        let err = RefError(file, node, `unresolvable identifier "${name}"`);
        let suggestions = this.findIDSuggestions(srcfiles, name);
        if (suggestions.length !== 0) {
          err.suggestion = this.formatIDSuggestions(suggestions);
        }
        errs.push(err);
      }
    });
    return errs;
  }


  _handleOnCyclicDepError(fileA, fileB) {
    let errs = [];
    let findErrs = (fileA, fileB) => {
      for (let name in fileA.definedIDs) {
        let ref = fileB.unresolvedIDs && fileB.unresolvedIDs[name] ||
                  fileB.resolvedIDs && fileB.resolvedIDs[name];
        if (ref && ref.level === 0) {
          errs.push({
            message: `"${name}" defined here`,
            srcloc:  SrcLocation(fileA.definedIDs[name].identifier, fileA)
          });
          errs.push({
            message: `"${name}" referenced here`,
            srcloc:  SrcLocation(ref.node, fileB)
          });
        }
      }
    };
    findErrs(fileA, fileB);
    findErrs(fileB, fileA);
    throw RefError(
      null,
      null,
      `cyclic dependency between source files "${fileA.name}" and "${fileB.name}"`+
      ` in package "${this.pkg.id}"`,
      errs
    );
  }


  _resolveIdentifierAcrossFiles(name:string, file:SrcFile, otherFile:SrcFile, depGraph:DAG) {
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

    if (file.unresolvedIDs[name].level === 0) {
      // program-level reference creates a hard dependency
      depGraph.add(file, otherFile); // file --[depends on]--> otherFile
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
          return 'built-in module "' + term.StderrStyle.boldCyan(s.name) + '"'
        } else {
          return term.StderrStyle.boldCyan(s.name) + ' defined in ' +
                 s.srcloc.formatFilename('green')
        }
      }).join('\n  ');
  }


  buildDepDescription(srcfiles:SrcFile[]) {
    // Note: Does NOT mutate srcfiles, but does read internal state
    var intersectKeys = function(a, b) {
      return [for (k of Object.keys(a)) if (b[k]) k ];
    };

    let msg = this.log.style.boldGreen(this.pkg.id);
    if (this.module instanceof TestModule) {
      msg += '(test)';
    }
    msg += ' cross-file dependencies:';
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

    return [msg, filenames]
  }


  fileDependsOn(fileA, fileB) {
    var dep = this._detectedDependencies[fileA.name];
    if (dep && dep.some(o => o.file === fileB)) {
      return dep
    }
  };


  fileDependsOnClasses(fileA, fileB) {
    var deps = this._detectedDependencies[fileA.name];
    if (deps) {
      // console.log('fileDependsOnClasses: '+fileA.name+' dependencies:');
      // deps.forEach(dep => {
      //   console.log(' ' + repr(dep.file.name) + ':');
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


  sortFiles(srcfiles:SrcFile[], depGraph:DAG) { //:SrcFile[]
    if (srcfiles.length === 1) {
      return srcfiles;
    }

    // Sort the directed graph of static (level 0) dependencies
    let L0 = depGraph.sort(this._handleOnCyclicDepError.bind(this));
    if (srcfiles.length === L0.length) {
      return L0;
    }

    // Some source files did not contain level 0 dependencies -- sort by level 1+ dependencies.
    let Ln = srcfiles.sort((fileA, fileB) => {
      if (this.fileDependsOn(fileA, fileB)) {
        return 1; // fileA comes before fileB
      }
      if (this.fileDependsOn(fileB, fileA)) {
        return -1; // fileA comes before fileB
      }
      return 0; // No difference
    }).filter(f => L0.indexOf(f) === -1);

    //Ln.forEach(depGraph.add.bind(depGraph));

    return Ln.concat(L0);
  }


}
