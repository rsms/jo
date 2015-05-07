import {types as t} from 'babel'


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

  post(file) {
    // Rename remapped identifiers in this file
    Object.keys(file.joRemappedIdentifiers).forEach((oldName) => {
      file.scope.rename(oldName, file.joRemappedIdentifiers[oldName]);
    });

    // console.log('scope bindings:');
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
    }
    file.scope.traverse(file.scope.block, {
      enter: function enter(node, parent, scope) {
        // console.log('node', repr(node,2));
        if (t.isReferencedIdentifier(node, parent)) {
          verifyReference(node.name, node, parent, scope);
        }
      }
    });

    // A map of any identifiers defined at the program-level of this file
    // console.log('file.scope.bindings:', repr(file.scope.bindings,2));
    Object.keys(file.scope.bindings).forEach(name => {
      var binding = file.scope.bindings[name];
      if (binding &&
          (binding.kind === 'var' || binding.kind === 'let' || binding.kind === 'hoisted') ) {

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
          let bindingKind =
            (binding.kind === 'hoisted') ? 'function' : binding.kind;
          let otherBindingKind =
            (existingDecl.binding.kind === 'hoisted') ? 'function' : existingDecl.binding.kind;
          throw ReferenceError(
            file.jofile,
            binding.node,
            `duplicate identifier in ${bindingKind} declaration`,
            [{ message: `${otherBindingKind} declared here`,
              srcloc: SrcLocation(existingDecl.binding.node, existingDecl.file)
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

      }
    });

  }

}


function dumpScopeBindings(scope, depth=0) {
  for (var k in scope.bindings) {
    console.log(
      '                                                                      '.substr(0,depth*2)+
      k, '=>', repr(scope.bindings[k],0)
    );
  }
  if (scope.parent) {
    dumpScopeBindings(scope.parent, depth+1);
  }
}
