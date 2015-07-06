import {SrcLocation, SrcError} from '../util'
import {types as t} from 'npmjs.com/babel'


function ReferenceError(file, node, message, related) {
  return SrcError('ReferenceError', SrcLocation(node, file), message, null, related);
}


export var FileLocalVarsTransformer = {

  IfStatement(node, parent, scope, file) {
    var test = node.test;
    if (test.type === 'Identifier' && test.name === '__DEV__' && !scope.getBindingInfo(test.name)) {
      if (node.consequent.type === 'BlockStatement' && !node.consequent._letReferences) {
        return node.consequent.body;
      }
      return node.consequent;
    }
  },

  Identifier(node, parent, scope, file) {
    if (node.name === '__DEV__' && !scope.getBindingInfo(node.name)) {
      return t.literal(file.joTarget.isDevMode);
    }
  },

  FunctionDeclaration(node, parent, scope, file) {
    if (node.id &&
        node.id.type === 'Identifier' &&
        node.id.name === 'init' &&
        parent.type === 'Program')
    {
      node.id = file.joLocalizeIdentifier(node.id.name);
      file.jofile.initFuncName = node.id.name;
    }
  },

  // ObjectExpression(node, parent, scope, file) {
  //   if (file.jofile.name === 'primate.js') {
  //     console.log('ObjectExpression:', repr(node,0))
  //   }
  // },

  post(file) {
    // Rename remapped identifiers in this file
    Object.keys(file.joRemappedIdentifiers).forEach((oldName) => {
      file.scope.rename(oldName, file.joRemappedIdentifiers[oldName]);
    });

    // dumpScopeBindings(file.scope);

    var undefinedSymbolResolvers = {

      React: (node, parent, scope) => {
        // Add `import React from "react"`
        file.joAddImplicitImport('react', {'default':'React'}, node);
        return true;
      },

      ReactComponent: (node, parent, scope) => {
        // Add `import {Component as ReactComponent} from "react"`
        file.joAddImplicitImport('react', {'Component':'ReactComponent'}, node);
        return true;
      },

    };

    // Attempt to automatically resolve any undefined references, like "React".
    var verifyReference = (name, node, parent, scope) => {
      if (!(node.name in file.joTarget.globals)) {
        var info = scope.getBindingInfo(node.name);
        if (!info) {
          let resolver = undefinedSymbolResolvers[node.name];
          if (!resolver || !resolver(node, parent, scope)) {
            if (!file.jofile.unresolvedIDs) { file.jofile.unresolvedIDs = {}; }
            if (!file.jofile.unresolvedIDs[node.name]) {
              file.jofile.unresolvedIDs[node.name] = {node:node};
            }
            if (file.jofile.superclassReferences) {
              let superclassRef = file.jofile.superclassReferences[node.name];
              if (superclassRef) {
                if (!file.jofile.unresolvedSuperclassIDs) {
                  file.jofile.unresolvedSuperclassIDs = {};
                }
                file.jofile.unresolvedSuperclassIDs[node.name] = superclassRef;
              }
            }
          }
        }
      }
    };

    file.scope.traverse(file.scope.block, {
      enter: function enter(node, parent, scope) {
        if (parent.type === 'BreakStatement') {
          // BUG: Can't handle "break to label" reference checks. This means that
          //      "break foo;" will not generate any errors, even when there's no
          //      label called "foo".
          return;
        }
        if (t.isReferencedIdentifier(node, parent)) {
          verifyReference(node.name, node, parent, scope);
        }
      }
    });

    // Special code for "exports default { ... }"
    if (file.joPkg.exports['default']) {
      file.scope.traverse(file.joPkg.exports['default'].node, {
        enter: function enter(node, parent, scope) {
          if (t.isReferencedIdentifier(node, parent)) {
            let name = node.name;
            if (!(name in file.joTarget.globals) && !(name in file.scope.globals)) {
              var info = scope.getBindingInfo(name);
              if (!info) {
                let remapped = file.joRemappedIdentifiers[name];
                if (remapped) {
                  node.name = remapped;
                }
              }
            }
          }
        }
      });
    }

    // A map of any identifiers defined at the program-level of this file
    // console.log('file.scope.bindings:', repr(file.scope.bindings,2));
    Object.keys(file.scope.bindings).forEach(name => {
      var binding = file.scope.bindings[name];
      if (binding &&
          (binding.kind === 'var' ||
           binding.kind === 'let' ||
           binding.kind === 'const' ||
           binding.kind === 'hoisted') )
      {

        if (!file.jofile.definedIDs) {
          file.jofile.definedIDs = {};
        }
        if (!file.jofile.definedIDs[name]) {
          file.jofile.definedIDs[name] = binding;
        }

        // Check for duplicate ID
        if (!file.joPkg.definedIDs) {
          file.joPkg.definedIDs = {};
        } else if(file.joPkg.definedIDs[name]) {
          let existingDecl = file.joPkg.definedIDs[name];

          let bindingKind = binding.kind;
          let otherBindingKind = existingDecl.binding.kind;
          let node = binding.node;
          let otherNode = existingDecl.binding.node;

          if (bindingKind === 'hoisted') {
            bindingKind = 'function';
            node = node.id;
          }

          if (otherBindingKind === 'hoisted') {
            otherBindingKind = 'function';
            otherNode = otherNode.id;
          }

          throw ReferenceError(
            file.jofile,
            node,
            `duplicate identifier in ${bindingKind} declaration`,
            [{ message: `${otherBindingKind} declared here`,
              srcloc: SrcLocation(otherNode, existingDecl.file)
            }]
          );
        }

        // Register ID
        file.joPkg.definedIDs[name] = {binding:binding, file:file.jofile};
        
        // Is main() function?
        if (name === 'main' && binding.node.type === 'FunctionDeclaration') {
          // Note: as main is included in definedIDs we already check for duplicate declarations,
          // so no need to check for duplicate mainFunc here.
          file.joPkg.mainFunc = {node: binding.node, file: file.jofile};
        }

      } //else console.log('other binding', binding ? binding.kind : binding);
    });
  }

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
