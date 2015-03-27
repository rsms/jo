var __DEV__ = true; // FIXME remove when we build ourselves

// interface Import {
//   ref:string                      // e.g. `import "lol/foo"` => 'lol/foo'
//   file:SrcFile
//   moduleID:AST.Identifier         // e.g. `import foo from "lol/foo"` => 'foo'
//   members:[{asID: AST.Identifier, srcID:AST.Identifier}, ...]
//      e.g. `import {Foo as bar} from "foo"` => {bar:'Foo'}
//   node:ASTNode                    // the import node
// }
import {types as t} from 'babel'

function ImportError(file, node, message, fixSuggestion, related) {
  return SrcError('ImportError', SrcLocation(node, file), message, fixSuggestion, related);
}

export var ModuleTransformer = {

  ImportDeclaration(node, parent, scope, file) {
    if (node.isType) return;

    if (node.range && node.range[0] > file.joFirstNonImportOffset) {
      throw ImportError(file.jofile, node, 'unexpected import below non-import statement');
    }

    // Note: Imports are only at "program" level, enforced by the parser,
    // so no need to check parent.type==='Program'.

    if (node.source.value.substr(0,14) === 'babel-runtime/') {
      node.jo_isRuntimeHelper = true;
    } else {
      if (node.specifiers.length) {
        // console.log('  specifiers:', )
        let hasDefault = false;
        for (let spec of node.specifiers) {
          spec.id._origName = spec.id.name; // because scope.rename() later on
          if (spec.name) {
            // x as y
            spec.name = file.joLocalizeIdentifier(spec.name.name)
          } else {
            spec.name = file.joLocalizeIdentifier(spec.id.name)
          }
          if (spec.default) {
            hasDefault = true;
          }
        }
        // if (!hasDefault) {
        //   console.log('!hasDefault', node.specifiers)
        //   let anonID = file.joGenAnonID();
        //   node.specifiers.splice(0,0, t.importSpecifier(anonID, null) );
        //   // node.specifiers[0].default = true;
        // }
      } else {
        // TODO: `import "bar/jo-foo.git"` -> `import foo from "bar/jo-foo.git"`
        let name = JSIdentifier.fromString(node.source.value);
        if (!name || !JSIdentifier.isValid(name)) {
          throw ImportError(file.jofile, node.source, 'failed to infer module identifier');
        }
        let id = file.joLocalizeIdentifier(name)
        node.specifiers = [ t.importSpecifier(t.identifier("default"), id) ];
        node.specifiers[0].default = true;
      }
    }

    // Extract imports -- will eventually be hoisted to package header
    file.joImports.push(node);
    file.scope.registerDeclaration(node);
    return [];
  },


  VariableDeclaration(node, parent, scope, file) {
    // Export UpperCase vars at the module level.
    // At this point in transformations, const, let and class have been
    // converted to var, so this catches all but function.
    if (parent.type === 'Program') {
      if (node.range && node.range[0] < file.joFirstNonImportOffset) {
        file.joFirstNonImportOffset = node.range[0];
      }
      var i, c0, id, decls = node.declarations, exportDecls = [];
      for (i = 0; i !== decls.length; ++i) {
        id = decls[i].id;
        c0 = id.name[0];
        if (c0 === c0.toUpperCase()) {
          // console.log('export var', repr(decls[i], 2))
          file.joRegisterExport(id.name, decls[i].id, /*isImplicitExport=*/true);
        }
      }
    }
  },


  FunctionDeclaration(node, parent, scope, file) {
    // Export UpperCase functions at the module level.
    if (parent.type === 'Program') {
      if (node.range && node.range[0] < file.joFirstNonImportOffset) {
        file.joFirstNonImportOffset = node.range[0];
      }
      let c0 = node.id.name[0];
      if (c0 === c0.toUpperCase()) {
        // console.log('export function', repr(node, 2))
        file.joRegisterExport(node.id.name, node.id, /*isImplicitExport=*/true);
      }
    }
  },


  ExportDeclaration(node, parent, scope, file) {
    // Note: Always at program-level.

    // Note: we don't see export statements until they have been processed by
    // some other part of Babel, which hoists them to the top, meaning that
    // if we set file.joHasPassedImports=true here, it will be set _before_
    // the first line. I.e. in this program:
    //   import 'a'
    //   export function f() {}
    // Babel will rewrite the AST to:
    //   export {f as f}
    //   import 'a'
    //   function f() {}
    // Meaning we will visit `export {f as f}` before we visit `import 'a'`.

    if (node.range && node.range[0] < file.joFirstNonImportOffset) {
      file.joFirstNonImportOffset = node.range[0];
    }

    if (node.declaration) {
      if (node.default) {
        // export default ...
        file.joRegisterExport('default', node.declaration);
      } else {
        if (__DEV__) { t.assertVariableDeclaration(node.declaration); }
        let decl = node.declaration.declarations[0];
        if (__DEV__) { t.assertVariableDeclarator(decl); }
        file.joRegisterExport(decl.id.name, decl.id);
        return node.declaration;
      }
    } else {
      // node.specifiers:ExportSpecifier[]
      // console.log('export', repr(node, 3))
      node.specifiers.forEach((spec) => {
        file.joRegisterExport(spec.name ? spec.name.name : spec.id.name, spec.id);
      })
    }
    return [];
  },


  post(file) {
    // Append export statements to the end.
    if (file.joIsLastFile) {
      Object.keys(file.joPkg.exports).forEach((name) => {
        let exp = file.joPkg.exports[name];
        let memberExpr;
        if (name === 'default') {
          file.ast.program.body.push(
            t.expressionStatement(
              t.assignmentExpression(
                '=',
                t.memberExpression(t.identifier("exports"), t.identifier("__esModule")),
                t.literal(true)
              )
            )
            // exp.node
          );
          // exports["default"]
          memberExpr = t.memberExpression(t.identifier("exports"), t.literal(name), true);
        } else {
          // exports.foo
          memberExpr = t.memberExpression(t.identifier("exports"), t.identifier(name));
        }
        file.ast.program.body.push(
          t.expressionStatement(
            t.assignmentExpression(
              '=',
              memberExpr,
              exp.node
            )
          )
          // exp.node
        );
      });
    }
  }

}
