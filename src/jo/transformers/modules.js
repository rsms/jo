// interface Import {
//   ref:string                      // e.g. `import "lol/foo"` => 'lol/foo'
//   file:SrcFile
//   moduleID:AST.Identifier         // e.g. `import foo from "lol/foo"` => 'foo'
//   members:[{asID: AST.Identifier, srcID:AST.Identifier}, ...]
//      e.g. `import {Foo as bar} from "foo"` => {bar:'Foo'}
//   node:ASTNode                    // the import node
// }
import {repr, JSIdentifier, SrcError, SrcLocation} from '../util'
import {types as t} from 'npmjs.com/babel'
var __DEV__ = true; // FIXME remove when we build ourselves

function ImportError(file, node, message, fixSuggestion, related) {
  return SrcError('ImportError', SrcLocation(node, file), message, fixSuggestion, related);
}


var implicitExportNameRe = /^[A-Z]/u;
  // TODO: Add all upper-case Unicode letters to the regex, e.g. \uXXXX-\uXXXX ...

function isImplicitExportName(name) {
  return name.match(implicitExportNameRe) //&& (name[0] === name[0].toUpperCase());
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
      //console.log('runtime-helper', repr(node,3));
      node.jo_isRuntimeHelper = true;
    } else {
      if (node.specifiers.length) {
        let hasDefault = false;
        for (let i = 0, L = node.specifiers.length; i !== L; ++i) {
          let spec = node.specifiers[i];
          let origName;
          if (spec.name) {
            // x as y
            origName = spec.name.name;
            spec.name = file.joLocalizeIdentifier(spec.name.name)
          } else {
            origName = spec.id.name;
            spec.id._origName = spec.id.name;
            spec.name = file.joLocalizeIdentifier(spec.id.name)
          }
          if (spec.type === 'ImportBatchSpecifier') {
            let rtHelperNode = {
              _blockHoist: 3,
              type: 'ImportDeclaration',
              specifiers: [
                { type: 'ImportSpecifier',
                  id: { type: 'Identifier', name: 'default' },
                  name: { type: 'Identifier', name: '_interopRequireWildcard' },
                }
              ],
              source: { type: 'Literal', value: 'babel-runtime/helpers/interop-require-wildcard' },
              jo_isRuntimeHelper: true,
            };
            // file.scope.registerDeclaration(rtHelperNode);
            file.scope.registerBinding("module", rtHelperNode);
            file.joImports.push(rtHelperNode);
          }
          spec.name._origName = origName; // because scope.rename() later on
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
    try {
      file.scope.registerBinding("module", node);
    } catch (e) {
      // Most likely duplicate
    }
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
      var i, id, decls = node.declarations, exportDecls = [];
      for (i = 0; i !== decls.length; ++i) {
        id = decls[i].id;
        if (isImplicitExportName(id.name)) {
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
      if (isImplicitExportName(node.id.name)) {
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


  // post(file) {
  //   // Append export statements to the end.
  //   if (file.joIsLastFile) {
  //     //file.ast.program.body
  //     console.log(repr(file.ast));
  //   }
  // }

}
