import {SrcLocation, SrcError, repr} from '../util'
import {types as t} from 'npmjs.com/babel-core'


function FileScope({ Plugin, types: t }) {
  return new Plugin("jo.fileScope", { visitor: visitor, post: post })
}
var visitor = {

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
};

function post(file) {
  var jo:CompileContext = file.opts._joctx;

  // Rename remapped identifiers in this file
  Object.keys(jo.remappedIdentifiers).forEach((oldName) => {
    let newName = jo.remappedIdentifiers[oldName];
    //assert(file.scope.getBindingInfo(oldName) != undefined);
    file.scope.rename(oldName, newName);
  });

  // dumpScopeBindings(file.scope);

  // Verify references and register unresolvable ones for inter-package linking
  file.scope.traverse(file.scope.block, {
    enter(node, parent, scope) {
      if (parent.type === 'BreakStatement') {
        // Babel already verifies labels
        // TODO: what do we do with labels on the Program level?
        return;
      }
      if (this.isReferencedIdentifier.call({node:node, parent:parent})) {
        jo.verifyReference(node.name, node, parent, scope);
      }
    }
  });

  // Special code for "exports default { ... }"
  if (jo.pkg.exports['default']) {
    file.scope.traverse(jo.pkg.exports['default'].node, {
      enter(node, parent, scope) {
        let name = node.name;
        if (this.isReferencedIdentifier.call({node:node, parent:parent})&&
            !(name in jo.target.globals) &&
            !(name in file.scope.globals) &&
            !scope.hasBinding(name))
        {
          let remapped = jo.remappedIdentifiers[name];
          if (remapped) {
            node.name = remapped;
          }
        }
      }
    });
  }

  // Register identifier definitions
  jo.registerIDDefinitions(file.scope)
}


// function dumpScopeBindings(scope, depth=0) {
//   let indent =
//     '                                                                      '.substr(0,depth*4);
//   for (var k in scope.bindings) {
//     console.log(indent+k, '=>', repr(scope.bindings[k],0));
//   }
//   if (depth !== -1 && scope.parent) {
//     console.log(indent+'.parent:');
//     dumpScopeBindings(scope.parent, depth+1);
//   }
// }
