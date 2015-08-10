import {SrcErrors, RefError, repr} from 'jo/util'
import {types as t} from 'npmjs.com/babel-core'


var FileScope = plugin("jo.fileScope", {

  IfStatement(node, parent, scope, file) {
    var test = node.test;
    if (test.type === 'Identifier' && test.name === '__DEV__' && !scope.hasBinding(test.name)) {
      if (node.consequent.type === 'BlockStatement' && !node.consequent._letReferences) {
        return node.consequent.body;
      }
      return node.consequent;
    }
  },

  Identifier(node, parent, scope, file) {
    if (node.name === '__DEV__' && !scope.hasBinding(node.name)) {
      // `__DEV__` => `true`|`false`
      // Makes "minification.deadCodeElimination" strip things like `if (__DEV__) { ... }`
      var jo:CompileContext = this.state.opts._joctx;
      return t.literal(jo.target.isDevMode);
    }
  },

  MemberExpression(node, parent, scope, file) {
    var jo = this.state.opts._joctx;
    if (jo.file.name === 'build.js') {
      // _core.Promise
      if (node.object.name === '_core') {
        console.log('MemberExpression:', repr(node,2))
      }
    }
  },

  FunctionDeclaration(node, parent, scope, file) {
    if (node.id &&
        node.id.type === 'Identifier' &&
        node.id.name === 'init' &&
        parent.type === 'Program')
    {
      var jo:CompileContext = this.state.opts._joctx;
      node.id = jo.localizeIdentifier(node.id.name);
      jo.file.initFuncName = node.id.name;
    }
  },

  post(file) {
    var jo:CompileContext = file.opts._joctx;

    // Rename remapped identifiers in this file
    Object.keys(jo.remappedIdentifiers).forEach((oldName) => {
      let newName = jo.remappedIdentifiers[oldName];
      //assert(file.scope.getBindingInfo(oldName) != undefined);
      file.scope.rename(oldName, newName);
    });

    // count references to imported modules
    let moduleRefs = {};
    let unusedImports = {};
    Object.keys(file.scope.bindings).forEach(name => {
      var b = file.scope.bindings[name];
      if (b.kind === 'module') {
        let m = moduleRefs[b.moduleRef];
        if (!m) {
          moduleRefs[b.moduleRef] = m = {ref:b.moduleRef, count:0, binding:b};
        }
        unusedImports[name] = {module:m, binding:b};
      }
    });


    file.scope.rename('babelHelpers', '_$rt');

    // verify a reference
    // populates jo.file.{unresolvedIDs,unresolvedSuperclassIDs}
    let verifyReference = function(node, parent, scope) {
      if (jo.verifyReference(node, parent, scope)) {
        // resolved file-locally -- check if it referes to an import
        let r = unusedImports[node.name];
        if (r) {
          r.module.count++;
          unusedImports[node.name] = null;
        }
        return true;
      }
      return false;
    };

    // Verify references and register unresolvable ones for inter-package linking
    file.scope.traverse(file.scope.block, {
      enter(node, parent, scope) {
        if (parent.type === 'BreakStatement') {
          // Babel already verifies labels
          // TODO: what do we do with labels on the Program level?
          return;
        }
        if (this.isReferencedIdentifier.call({node:node, parent:parent})) {
          verifyReference(node, parent, scope);
        }
      }
    });

    // Special code for "exports default { ... }"
    let defaultExp = jo.module.exports.get('default');
    if (defaultExp) {
      var visitID = function(node, parent, scope) {
        let name = node.name;
        if (!(name in jo.target.globals) &&
            !(name in file.scope.globals) &&
            !scope.hasBinding(name))
        {
          return jo.remappedIdentifiers[name];
        }
      };
      file.scope.traverse(defaultExp.node, {
        enter(node, parent, scope) {
          if (node.type === 'Property') {
            let newName = visitID(node.value, node, scope);
            if (newName) {
              if (node.shorthand) {
                let newValueNode = Object.assign({}, node.value, {name:newName});
                node.value = newValueNode;
              } else {
                node.value.name = newName;
              }
            }
            verifyReference(node.value, node, scope);
          } else if (parent.type !== 'Property' &&
                     this.isReferencedIdentifier.call({node:node, parent:parent}))
          {
            let newName = visitID(node, parent, scope);
            if (newName) {
              node.name = newName;
            }
            verifyReference(node, parent, scope);
          }
        }
      });
    }

    // Register any unused imports
    let errs;
    Object.keys(unusedImports).forEach(name => {
      let imp = unusedImports[name];
      if (imp) {
        if (!errs) { errs = []; }
        let origName = jo.originalNameForLocalizedName(name) || name;
        if (imp.binding.identifier.start) {
          errs.push(RefError(
            jo.file,
            imp.binding.identifier.start ? imp.binding.identifier : imp.binding.path.node,
            `unused import "${origName}" from "${imp.module.ref}"`
          ));
        } else {
          errs.push(RefError(jo.file, imp.binding.path.node, `unused import "${imp.module.ref}"`));
        }
      }
    });
    if (errs) {
      throw SrcErrors(errs);
    }

    // Register identifier definitions (populates jo.pkg.definedIDs and jo.file.definedIDs
    jo.registerIDDefinitions(file.scope);

  },

});
