import {
  repr,
  SrcError,
  ImportError,
  ExportError,
  RefError,
  SrcLocation,
} from './util'
import {types as t} from 'npmjs.com/babel-core'
import {ok as assert} from 'assert'

function DupIDRefError(binding:IDBinding, otherBindings:IDBinding[]) {
  return RefError(
    binding.file,
    binding.id,
    `duplicate identifier ${'`'+binding.id.name+'`'} in ${binding.kind} declaration`,
    otherBindings.map(b => { return {
      message: `${b.kind} declared here`,
      srcloc: SrcLocation(b.id, b.file)
    }})
  );
}

class CompileContext {
  constructor(pkg:Pkg, module:Module, file:SrcFile, target:Target, log:Logger) {
    this.pkg    = pkg;  // old: joPkg
    this.module = module;
    this.file   = file; // old: jofile
    this.target = target;  // old: joTarget
    this.log    = log

    this.fileIDName = '_' + file.id;  // old: joFileIDName
    this.firstNonImportNode = {range:[Infinity]};  // old: joFirstNonImportOffset
    this.imports = []; // ImportDeclaration[]  // old: joImports
    this.remappedIdentifiers = {}; // old: joRemappedIdentifiers
  }


  localizeIdentifier(name:string) { // old: joLocalizeIdentifier
    // takes an identifier and registers it as "local" for this file, effectively
    // prefixing the id with that of the source file name.
    var newID = t.identifier(this.fileIDName + '$' + name);
    this.remappedIdentifiers[name] = newID.name;
    return newID;
  }


  originalNameForLocalizedName(name:string) {
    for (let newName in this.remappedIdentifiers) {
      if (name === this.remappedIdentifiers[newName]) {
        return newName;
      }
    }
    return null;
  }


  addImplicitImport(ref, specs, node=null) {
    // Adds the equivalent of `import name from "ref"`
    this.imports.push(mkimport({ref, specs, node, isImplicit:true, srcfile:this.file}));
  }


  registerFirstNonImport(node) {
    if (node.range && node.range[0] < this.firstNonImportNode.range[0]) {
      this.firstNonImportNode = node;
    }
  }


  checkIsBeforeFirstNonImport(node) {
    if (node.range && node.range[0] > this.firstNonImportNode.range[0]) {
      throw ImportError(this.file, node, 'unexpected import below non-import statement', null, [
        { message: `${this.firstNonImportNode.kind} declared here`,
          srcloc: SrcLocation(this.firstNonImportNode, this.file) }
      ]);
    }
  }


  registerExport(name, node, isImplicitExport=false) { // old: joRegisterExport
    var errmsg, existingExport = this.module.exports.get(name);

    if (existingExport) {
      if (existingExport.node === node) {
        // Same export. This happens for redundant "export" statements
        if (this.log.level >= Logger.INFO) {
          this.log.info(
            SrcError.formatSource(
              SrcLocation(node, this.file),
              '"export" statement has no effect on already implicitly-exported symbol',
              /*errname=*/null,
              /*caretColor=*/'magenta',
              /*linesB=*/0
            )
          );
        }
        return;
      }
      errmsg = (name === 'default') ?
        'duplicate default export in package' :
        'duplicate exported symbol in package';
      throw ExportError(this.file, node, errmsg, null, [
        { message: 'also exported here',
          srcloc:  SrcLocation(existingExport.node, existingExport.file) }
      ])
    }

    if (name === 'default') {
      let prevExports = [], prevExportsLimit = 3;
      for (let exp of this.module.exports.values()) {
        if (!exp.isImplicit && prevExports.length < prevExportsLimit) {
          prevExports.push({
            message: 'specific export here',
            srcloc:  SrcLocation(exp.node, exp.file)
          });
        }
      }
      if (prevExports.length) {
        // case: "export default" after explicit "export x"
        throw ExportError(
          this.file,
          node,
          'default export mixed with specific '+(prevExports.length > 1 ? 'exports' : 'export'),
          null,
          prevExports
        );
      }
      // Overwrite any implicit exports
      this.module.exports = new Map;
      this.file.exports = new Map;
    } else {
      let defaultExp = this.module.exports.get('default');
      if (defaultExp) {
        if (isImplicitExport) {
          return; // simply ignore
        }
        throw ExportError(
          this.file,
          node,
          'specific export mixed with default export',
          null, [{
            message: 'default export here',
            srcloc:  SrcLocation(defaultExp.node, defaultExp.file)
          }]
        )
      }
    }

    let exp = {
      name:name,
      file:this.file,
      node:node,
      isImplicit:isImplicitExport
    };

    this.module.exports.set(name, exp);

    if (!this.file.exports) { this.file.exports = new Map; }
    this.file.exports.set(name, exp);
  }


  autoResolveIdentifier(node, parent, scope) {
    var autoResolvers = {
      // Attempts to automatically resolve any undefined references, like "React".
      React: (node, parent, scope) => {
        // Add `import React from "react"`
        this.addImplicitImport('react', {'default':'React'}, node);
        return true;
      },

      ReactComponent: (node, parent, scope) => {
        // Add `import {Component as ReactComponent} from "react"`
        this.addImplicitImport('react', {'Component':'ReactComponent'}, node);
        return true;
      },

      'assert': (node, parent, scope) => {
        if (this.target.builtInModuleRefs['assert']) {
          // TODO: More flexible way to support assert, maybe by having the target
          // provide the code in some way
          this.addImplicitImport('assert', {'ok':'assert'}, node);
          return true;
        }
        // TODO: if target is not in "dev mode", allow stripping asserts away
      }

    };
    let resolver = autoResolvers[node.name];
    return (resolver && resolver(node, parent, scope));
  }


  verifyReference(node, parent, scope, isNewName:bool) { //:bool -- true if locally resolved
    // @MUTATES this.file.unresolvedIDs
    // @MUTATES this.file.unresolvedSuperclassIDs

    let name = node.name;

    // Is a global (meaning it will always resolve)?
    //
    // TODO FIXME [BUG] if we import an ID that matches a global, it won't resolve. E.g:
    //   import {console}, foo from 'foo'
    //   assert(console === foo.console) // false
    //
    if (name in this.target.globals) {
      return true;
    }

    // Resolves to something in this scope?
    let binding = scope.getBinding(name);
    if (binding) {
      if (binding.references === 0) {
        binding.reference();
      }
      return true;
    }

    // Is generated or otherwise global binding?
    if (scope.hasBinding(name, /*noGlobals=*/true)) {
      return true;
    }

    // Can be automatically resolved?
    //
    // TODO: We might want to change the behaviour here.
    //   foo/a.js
    //     var React = 1;
    //   foo/b.js
    //     console.log(React) // ?
    //
    // ? = `[module React]` with current logic, but
    // ? = `1` might be a better solution here.
    // We could simply postpone the auto-resolve until later when we link unresolved IDs.
    //
    if (this.autoResolveIdentifier(node, parent, scope)) {
      return true;
    }

    // Not resolving within this source file.
    // Later on when all source files of this package has been parsed, one of the following is true:
    //   a) Ref resolves with an ID in another source file within this package
    //   b) Fails to resolve
    // For now, let's register the ID as unresolved for this srcfile
    if (!this.file.unresolvedIDs) { this.file.unresolvedIDs = {}; }
    let ref = this.file.unresolvedIDs[name];
    if (!ref) {
      this.file.unresolvedIDs[name] = {node:node, level:scope.parent ? 1 : 0};
      if (this.file.superclassReferences) {
        let superclassRef = this.file.superclassReferences[name];
        if (superclassRef) {
          if (!this.file.unresolvedSuperclassIDs) { this.file.unresolvedSuperclassIDs = {}; }
          this.file.unresolvedSuperclassIDs[name] = superclassRef;
        }
      }
    } else if (!scope.parent && ref.level !== 0) {
      // Upgrade reference importance
      ref.level = 0;
    } // else: ignore higher-level duplicate ID

    return false;
  }


  _registerIDDefinitionInFile(scope, name, binding) {
    // Check for duplicate ID in file
    if (binding.constantViolations.length !== 0) {
      let errs = [];
      binding.constantViolations.reverse().forEach(v => {
        // Note: reverse to format in order of definition
        if (v.shouldSkip || !v.node || !v.node.id /*not a declaration, so not a name violation*/) {
          return;
        }
        let ids = v.getBindingIdentifiers();
        Object.keys(ids).forEach(name => {
          var b = scope.bindings[name];
          if (__DEV__) { assert(b) }
          errs.push(IDBinding(ids[name], b.kind, this.file))
        })
      });
      if (errs.length !== 0) {
        throw DupIDRefError(IDBinding(binding.identifier, binding.kind, this.file), errs)
      }
    }

    if (this.file._classDeclarationIDs && this.file._classDeclarationIDs[name]) {
      // Mark as class because at this point, classes have been down-converted to "let", meaning
      // we wouldn't know what is a class and what isn't, unless we do this.
      binding.isClassDeclaration = true;
    }

    // Register ID in file
    if (!this.file.definedIDs) { this.file.definedIDs = {}; }
    if (__DEV__) { assert(!this.file.definedIDs[name]) }
    this.file.definedIDs[name] = binding;
  }


  _registerIDDefinitionInPkg(scope, name, binding) {
    // Check for duplicate ID in package
    if (!this.pkg.definedIDs) {
      this.pkg.definedIDs = {};
    } else {
      let existing = this.pkg.definedIDs[name];
      if (existing) {
        let newfound = IDBinding(binding.identifier, binding.kind, this.file)
        existing = IDBinding(existing.binding.node, existing.binding.kind, existing.file);
        throw DupIDRefError(newfound, [existing])
      }
    }

    // Register ID in package
    let definition = {binding:binding, file:this.file};
    this.pkg.definedIDs[name] = definition;

    // Is main() function?
    if (name === 'main' && binding.path.type === 'FunctionDeclaration') {
      // Note: as main is included in definedIDs we already check for duplicate declarations,
      // so no need to check for duplicate mainFunc here.
      if (this.file.isTest) {
        throw SrcError(
          'SrcError',
          SrcLocation(binding.identifier, this.file),
          'main function not allowed in test file'
        );
      }
      this.module.mainFunc = definition;
    }
  }


  registerIDDefinitions(scope) {
    // Registers any identifiers defined in the provided scope
    // @MUTATES this.pkg.definedIDs
    // @MUTATES this.file.definedIDs
    Object.keys(scope.bindings).forEach(name => {
      var b = scope.bindings[name];
      assert(!!b);
      switch (b.kind) {
        case 'var':
        case 'let':  // includes class declarations
        case 'const':
        case 'hoisted': {
          // console.log('binding "'+name+'":', repr(b,1))
          this._registerIDDefinitionInFile(scope, name, b);
          this._registerIDDefinitionInPkg(scope, name, b);
          break;
        }

        case 'unknown': {
          if (b.path.type === 'TypeAlias' || b.path.type === 'InterfaceDeclaration') {
            // E.g. type Foo = ...
            //           ~~~  TODO: this._registerTypeAlias()
            // E.g. interface Foo {...}
            //           ~~~  TODO: this._registerInterface()
          } else {
            let loc = SrcLocation(b.identifier, this.file);
            this.log.warn(
              SrcError.formatSource(loc, 'registerIDDefinitions: unexpected "unknown" binding'),
              repr(b,1)
            );
          }
          break;
        }

        // case 'module':
          // - Module imports are file-local and we don't register them for linking
          // - Babel enforces that no duplicate imports occur, meaning that
          //   binding.constantViolations is always empty for "module" bindings.

        // case 'type':
          // - Type declarations are pure sugar and thus not used for linking
      }
    });
  }


  requireJoHelper(name:string) { //:JoHelper
    let helper = this.target.joHelper(name);
    this.module.registerJoHelper(name);
    return helper;
  }

}
