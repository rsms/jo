import {types as t} from 'babel'


function ReferenceError(file, node, message, related) {
  return SrcError('ReferenceError', SrcLocation(node, file), message, null, related);
}


export var FileLocalVarsTransformer = {

  // VariableDeclaration(node, parent, scope, file) {
  //   // console.log('scope:', repr(scope));
  //   node.declarations.forEach((decl) => renameID(decl.init, scope, file) );
  //   return node;
  // },

  // ObjectExpression(node, parent, scope, file) {
  //   node.properties.forEach((prop) => {
  //     prop.value = file.joMapFileLocalID(prop.value, scope);
  //     // console.log('prop', repr(prop, 2));
  //   });
  //   return node;
  // },

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
    };

    var globals = {'require':1, 'exports':1, 'this':1, 'undefined':1};

    var verifyReference = (name, node, parent, scope) => {
      if (!(node.name in globals)) {
        var info = scope.getBindingInfo(node.name);
        if (!info) {
          let resolver = undefinedSymbolResolvers[node.name];
          if ( (!resolver || !resolver(node, parent, scope)) &&
               file.joTarget.undefinedReferenceIsError
             )
          {
            throw ReferenceError(file.jofile, node, 'unresolvable identifier "'+node.name+'"');
          }
        }
      }
    }

    file.scope.traverse(file.scope.block, {
      enter: function enter(node, parent, scope) {
        // var info = scope.getBindingInfo(node.);
        if (t.isReferencedIdentifier(node, parent)) {
          // let newName = file.joRemappedIdentifiers[oldName];
          verifyReference(node.name, node, parent, scope);
        }

        // if (t.isReferencedIdentifier(node, parent) && node.name === oldName) {
        //   node.name = newName;
        // } else if (t.isDeclaration(node)) {
        //   var ids = t.getBindingIdentifiers(node);
        //   for (var name in ids) {
        //     if (name === oldName) ids[name].name = newName;
        //   }
        // } else if (t.isScope(node, parent)) {
        //   if (!scope.bindingIdentifierEquals(oldName, binding)) {
        //     this.skip();
        //   }
        // }
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
