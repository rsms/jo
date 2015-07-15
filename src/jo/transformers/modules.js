// interface Import {
//   ref:string                      // e.g. `import "lol/foo"` => 'lol/foo'
//   file:SrcFile
//   moduleID:AST.Identifier         // e.g. `import foo from "lol/foo"` => 'foo'
//   members:[{asID: AST.Identifier, srcID:AST.Identifier}, ...]
//      e.g. `import {Foo as bar} from "foo"` => {bar:'Foo'}
//   node:ASTNode                    // the import node
// }
import {repr, JSIdentifier, ImportError, SrcLocation} from '../util'
import {types as t} from 'npmjs.com/babel-core'
import {ok as assert} from 'assert'

var implicitExportNameRe = /^[A-Z]/u;
  // TODO: Add all upper-case Unicode letters to the regex, e.g. \uXXXX-\uXXXX ...
function isImplicitExportName(name) {
  return name.match(implicitExportNameRe) //&& (name[0] === name[0].toUpperCase());
}


function Modules({ Plugin, types: t }) {
  return new Plugin("jo.modules", { visitor: visit })
}

var visit = {

  ImportDeclaration(node, parent, scope, file) {
    if (node.isType) return;
    var jo:CompileContext = this.state.opts._joctx;

    jo.checkIsBeforeFirstNonImport(node)

    // Note: Imports are only at "program" level, enforced by the parser,
    // so no need to check parent.type==='Program'.

    //console.log('node.source', repr(node.source,2))
    if (__DEV__) { assert(!!node.source.value); }

    if (node.source.value.substr(0,14) === 'babel-runtime/') {
      //console.log('runtime-helper', repr(node,2));
      node.jo_isRuntimeHelper = true;

    } else {
      if (node.specifiers.length) {
        for (let i = 0, L = node.specifiers.length; i !== L; ++i) {
          // Localize imported specs, i.e. "x as y" => "x as _foo_js$y"
          let spec = node.specifiers[i];
          let origName = spec.local.name;
          spec.local = jo.localizeIdentifier(origName)
          spec.local._origName = origName; // because scope.rename() later on in file-local-vars
          // if (spec.imported) {
          //   console.log('imp spec: {' + spec.imported.name + ' as ' + spec.local.name + '}' +
          //               ' from', repr(node.source.value));
          // } else {
          //   console.log('imp spec: ' + spec.local.name + ' from', repr(node.source.value));
          // }
        }
      } else { // no specifiers
        // Shorthand `import "bar/jo-foo.git"` == `import foo from "bar/jo-foo.git"`
        let localName = JSIdentifier.fromString(node.source.value);
        if (!localName || !JSIdentifier.isValid(localName)) {
          throw ImportError(jo.file, node.source, 'failed to infer module identifier');
        }

        // Register binding as non-localized name so that we later can correctly do scope.rename
        file.scope.registerBinding("module", {
          node: node,
          isVariableDeclaration: () => { return false; },
          getBindingIdentifiers: () => {
            return {[localName]: t.identifier(localName) }
          },
        });

        // Localize specifier
        node.specifiers = [ t.importSpecifier(jo.localizeIdentifier(localName), null) ];
        // console.log('imp spec: ' + node.specifiers[0].local.name + ' <implicitly from>',
        //             repr(node.source.value));
      }
    }

    // Extract imports -- will eventually be hoisted to package header
    jo.imports.push(node);
    return []; // remove import declaration from AST (we'll codegen it later)
  },


  VariableDeclaration(node, parent, scope, file) {
    // Export UpperCase vars at the module level.
    // At this point in transformations, const, let and class have been
    // converted to var, so this catches all but function.
    if (parent.type !== 'Program') {
      return;
    }
    let jo:CompileContext = this.state.opts._joctx;
    jo.registerFirstNonImport(node)
    let i, id, decls = node.declarations, exportDecls = [];
    for (i = 0; i !== decls.length; ++i) {
      id = decls[i].id;
      if (isImplicitExportName(id.name)) {
        // console.log('export var', repr(decls[i], 1))
        jo.registerExport(id.name, decls[i].id, /*isImplicitExport=*/true);
      }
    }
  },


  FunctionDeclaration(node, parent, scope, file) {
    // Export UpperCase functions at the module level.
    if (parent.type !== 'Program') {
      return;
    }
    let jo:CompileContext = this.state.opts._joctx;
    jo.registerFirstNonImport(node)
    if (isImplicitExportName(node.id.name)) {
      // console.log('export function', repr(node, 2))
      jo.registerExport(node.id.name, node.id, /*isImplicitExport=*/true);
    }
  },


  ExportDeclaration(node, parent, scope, file) {
    // Note: Always at program-level, enforced by Babel

    // Note: we don't see export statements until they have been processed by
    // some other part of Babel, which hoists them to the top, meaning that
    // we will see exports earlier than they appear in the source code.

    let jo:CompileContext = this.state.opts._joctx;

    jo.registerFirstNonImport(node)

    let decl = node.declaration;
    let returnExprs = [];

    if (node.type === 'ExportNamedDeclaration') {
      if (decl) {
        if (decl.type === 'VariableDeclaration') {
          // e.g. `export var x = 1, y = 2` => `exports.x = x; exports.y = y`
          decl.declarations.forEach(decl => {
            jo.registerExport(decl.id.name, decl.id)
          })
        } else if (decl.type === 'FunctionDeclaration' || decl.type === 'ClassDeclaration') {
          // e.g. `export function x() {}` => `exports.x = x`
          // e.g. `export class x() {}` => `exports.x = x`
          // Note: Babel checks for illegal `export function() {}` and so we will never
          // be given a decl w/o a valid ID.
          jo.registerExport(decl.id.name, decl.id)
        } else if (__DEV__) {
          throw new Error('unexpected export declaration ' + decl.type + ': ' + repr(decl))
        }
        returnExprs.push(decl); // we need the declaration to be codegen'd
      } else {
        // Aliases
        // e.g. `export {a, bar as b}` => `exports.a = a; exports.b = bar`
        if (__DEV__) { assert(node.specifiers.length !== 0) }
        node.specifiers.forEach(spec => {
          jo.registerExport(spec.exported.name, spec.local)
        })
      }

    } else {
      // e.g. `export default ...`
      if (__DEV__) { assert(node.type === 'ExportDefaultDeclaration') }
      if (decl.type === 'FunctionDeclaration' || decl.type === 'ClassDeclaration') {
        // Named functions and classes
        // e.g. `export default function x() {}` => `exports["default"] = x`
        // e.g. `export default class x {}` => `exports["default"] = x`
        jo.registerExport('default', decl.id);
        returnExprs.push(decl); // we need the function or class to be codegen'd
      } else {
        // literals, expressions, IDs, etc.
        // e.g. `export default x` => `exports["default"] = x`
        // e.g. `export default {x:1}` => `exports["default"] = {x:1}`
        // e.g. `export default {x, y}` => `exports["default"] = {x:x, y:y}`
        // e.g. `export default function() {}` => `exports["default"] = function() {}`
        jo.registerExport('default', decl);
      }
    }

    return returnExprs;
  },

  // Program: { exit(node, parent) { console.log('Program: exit') } }
}
