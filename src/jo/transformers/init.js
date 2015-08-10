// interface Import {
//   ref:string                      // e.g. `import "lol/foo"` => 'lol/foo'
//   file:SrcFile
//   moduleID:AST.Identifier         // e.g. `import foo from "lol/foo"` => 'foo'
//   members:[{asID: AST.Identifier, srcID:AST.Identifier}, ...]
//      e.g. `import {Foo as bar} from "foo"` => {bar:'Foo'}
//   node:ASTNode                    // the import node
// }
import {repr, JSIdentifier, ImportError, SyntaxError, G} from 'jo/util'
import {types as t} from 'npmjs.com/babel-core'
import {ok as assert} from 'assert'
import 'path'

var implicitExportNameRe = /^[A-Z]/u;
  // TODO: Add all upper-case Unicode letters to the regex, e.g. \uXXXX-\uXXXX ...
function isImplicitExportName(name) {
  return name.match(implicitExportNameRe) //&& (name[0] === name[0].toUpperCase());
}


function resolveRelativeImportRef(ref:string, node, file, pkg) {
  if (ref === '..' || ref == '.' || ref.endsWith('/..')) {
    // Must end in a name (not just a parent or local alias)
    throw ImportError(file, node.source, 'invalid relative import');
  } else if (ref.startsWith('./') || ref.startsWith('../')) {
    // Resolve ref based on importing package
    if (!pkg.ref) {
      // Package in some directory
      // E.g. pkg.dir=/foo/bar, ref=./lol     => "/foo/bar/lol"
      // E.g. pkg.dir=/foo/bar, ref=../lol    => "/foo/lol"
      // E.g. pkg.dir=/foo/bar, ref=../../lol => "/lol"
      ref = path.join(pkg.dir, ref);
    } else {
      // Package within this package
      // E.g. pkg.ref=foo/bar, ref=./lol      => "foo/bar/lol"
      // E.g. pkg.ref=foo/bar, ref=../bar/lol => "foo/bar/lol"
      // E.g. pkg.ref=foo/bar, ref=../lol     => Error
      ref = path.join(pkg.ref, ref);
      if (!ref.startsWith(pkg.ref)) {
        throw ImportError(file, node.source, 'relative import outside non-local package');
      }
    }
  }
  return ref;
}


var Init = plugin("jo.init", {

  pre(file) {
    var jo:CompileContext = file.opts._joctx;
    file.set("helpersNamespace", jo.target.helpersObjectASTForFile(jo.file));
  },

  ImportDeclaration(node, parent, scope, file) {
    if (node.isType) return;
    var jo:CompileContext = this.state.opts._joctx;

    jo.checkIsBeforeFirstNonImport(node)

    // Note: Imports are only at "program" level, enforced by the parser,
    // so no need to check parent.type==='Program'.

    let ref = node.source.value;
    if (__DEV__) {
      assert(!!ref);
      assert(ref.indexOf('babel-runtime/') !== 0);
    }

    // Canonicalize relative import
    if (ref[0] === '.') {
      node.source.value = ref = resolveRelativeImportRef(ref, node, jo.file, jo.pkg);
    }

    if (node.specifiers.length) {
      for (let i = 0, L = node.specifiers.length; i !== L; ++i) {
        // Localize imported specs, i.e. "x as y" => "x as _foo_js$y"
        let spec = node.specifiers[i];
        let origName = spec.local.name;
        if (origName === '_') {
          spec.local = null;
          spec.imported = null;
          file.scope.removeBinding(origName);
        } else {
          spec.local = jo.localizeIdentifier(origName)
          spec.local._origName = origName; // because scope.rename() later on in file-local-vars
          if (spec.type !== 'ImportDefaultSpecifier') {
            // Make a copy of spec.imported so to avoid localize-rename in scope when local
            // and imported are the same.
            spec.imported = Object.assign({}, spec.imported);
          }
          let b = file.scope.bindings[origName];
          if (__DEV__) { assert(b); }
          b.moduleRef = ref;
        }
      }
    } else { // no specifiers
      // Shorthand `import "bar/jo-foo.git"` == `import foo from "bar/jo-foo.git"`
      let localName = JSIdentifier.fromModuleRef(ref);
      if (!localName || !JSIdentifier.isValid(localName)) {
        throw ImportError(jo.file, node.source, 'failed to infer module identifier');
      }

      // Register binding as non-localized name so that we later can correctly do scope.rename
      file.scope.registerBinding("module", {
        node: node,
        isVariableDeclaration: () => { return false; },
        getBindingIdentifiers: () => {
          return {[localName]: [t.identifier(localName)] }
        },
      });

      let b = file.scope.bindings[localName];
      if (__DEV__) { if(!b) { console.log('localName:',localName); } assert(b); }
      b.moduleRef = ref;

      // Localize specifier
      node.specifiers = [ t.importSpecifier(jo.localizeIdentifier(localName), null) ];
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
      jo.registerExport(node.id.name, node.id, /*isImplicitExport=*/true);
    }
  },


  ClassDeclaration(node, parent, scope, file) {
    var jo:CompileContext = this.state.opts._joctx;

    // Export UpperCase classes at the module level.
    if (parent.type === 'Program') {
      jo.registerFirstNonImport(node)
      if (isImplicitExportName(node.id.name)) {
        jo.registerExport(node.id.name, node.id, /*isImplicitExport=*/true);
      }
    }

    // Register as class, later to be used to mark "let" identifiers in
    // CompileCtx.registerIDDefinitions
    if (!jo.file._classDeclarationIDs) { jo.file._classDeclarationIDs = {}; }
    jo.file._classDeclarationIDs[node.id.name] = true;

    // Note: FileScope/post registers class declarations in file.definedIDs
    //       as babel.es6.classes has converted classes to "let" vars.

    if (node.superClass) {
      if (!jo.file.superclassReferences) { jo.file.superclassReferences = {}; }
      jo.file.superclassReferences[node.superClass.name] = node;
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


  CallExpression(node, parent, scope, file) {
    let jo:CompileContext = this.state.opts._joctx;
    if (node.callee.name === 'enum' && node.callee.type === 'Identifier') {

      // Generates something like this:
      // const ErrorCode = Object.freeze({
      //   __proto__: _enum,
      //   OK: Symbol('OK'),
      //   //[_enum.__n]: 'ErrorCode',
      // });

      if (node.arguments.length === 0) {
        throw SyntaxError(jo.file, node, 'empty enum');
      }

      let helper = jo.requireJoHelper('enum');
      let helperNode = jo.target.joHelperAccessNode(helper);
      let enumName = nameForNode(parent);
      let enumValues = [];

      let props = [
        t.property('init', t.identifier('__proto__'), helperNode)
      ];

      props = props.concat(node.arguments.map(keyNode => {
        if (keyNode.type !== 'Identifier') {
          let suggestion;
          let name = nameForNode(keyNode);
          if (name) {
            if (typeof name === 'string') {
              suggestion = JSIdentifier.fromString(name);
            } else if (typeof name === 'number' && ''+parseInt(name) === ''+name) {
              let prefix;
              if (enumName) {
                prefix = G.last(G.matches(enumName, /^.[^A-Z]*|[A-Z]+[^A-Z]*/g));
              }
              suggestion = (prefix || '_') + name;
            }
          }
          throw SyntaxError(
            jo.file,
            keyNode,
            'invalid enum member',
            'Must be an identifier (not a '+keyNode.type.toLowerCase()+')' +
              (suggestion ? '. How about ' + jo.log.errstyle.cyan(suggestion) + '?' : '')
          );
        }
        enumValues.push(keyNode.name);
        return t.property(
          'init',
          keyNode,
          t.callExpression(t.identifier('Symbol'), [t.literal(keyNode.name)])
        );
      }));

      // Name for debugging
      if (jo.target.isDevMode && enumName) {
        props.push(t.property(
          'init',
          t.memberExpression(helperNode, t.identifier('__n')),
          t.literal(enumName),
          /*computed=*/true
        ))
      }

      let objExpr = t.objectExpression(props);
      // Note: to only generate an object expression without freezing it, simply return
      // `objExpr` here instead of modifying `node`.
      node.callee = t.memberExpression(t.identifier('Object'), t.identifier('freeze'));
      node.arguments = [objExpr];

      let enumInfo = {name:enumName, values:enumValues};
      node.joEnum = enumInfo;

      if (parent.type === 'VariableDeclarator') {
        // Memoize in var so that we can look up enum values for static analysis
        parent.id.joEnum = enumInfo;
      }
    }
  },

});


function nameForNode(node) {
  if (node.type === 'Identifier') {
    return node.name;
  } else if (node.type === 'Literal') {
    return node.value;
  } else if (node.type === 'VariableDeclarator') {
    return node.id.name;
  }
  return null;
}
