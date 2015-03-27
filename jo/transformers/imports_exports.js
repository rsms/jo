
// interface Import {
//   ref:string                      // e.g. `import "lol/foo"` => 'lol/foo'
//   file:SrcFile
//   moduleID:AST.Identifier         // e.g. `import foo from "lol/foo"` => 'foo'
//   members:[{asID: AST.Identifier, srcID:AST.Identifier}, ...]
//      e.g. `import {Foo as bar} from "foo"` => {bar:'Foo'}
//   node:ASTNode                    // the import node
// }

// interface Export {
//   default:bool        // e.g. `export default {...}` => true
//   specifiers:{id:string, node:ASTNode}[]
//     // e.g. `export {a}` => [{id:'a', node:{...}}]
//     // e.g. `export default {a}` => [{id:'default', node:{...}}]
//   node:ASTNode     // the export node
// }


function ImportError(file, node, message, fixSuggestion, related) {
  return SrcError('ImportError', SrcLocation(node, file), message, fixSuggestion, related);
}

function ExportError(file, node, message, fixSuggestion, related) {
  return SrcError('ExportError', SrcLocation(node, file), message, fixSuggestion, related);
}


export var ImportExportVisitor = {
  // visitTYPE(path:NodePath)

  visitImportDeclaration: function(path) {
    var node = path.node;
    // console.log('ImportDeclaration', inspect(node, {depth:6}));

    // import must appear in program body
    if (path.parent.name !== 'program') {
      throw ExportError(this.file, node, 'unexpected import inside '+path.parent.value.type);
    }

    // T.ModuleSpecifier.assert(node.source);
    var imp = {
      ref: node.source.value,
      file: this.file,
      moduleID:null, // AST.Identifier
      members:[],    // [{asID: AST.Identifier, srcID:AST.Identifier}, ...]
      node: node,
    };

    var moduleID = null; // :AST.Identifier
    var moduleMembers = [];  // :{srcID:B.Identifier, asID:B.Identifier}[]

    if (node.specifiers.length === 0) {
      // e.g. `import "foo"` (no identifier)
      imp.moduleID = JSIdentifier.fromString(imp.ref);
      if (!imp.moduleID || !JSIdentifier.isValid(imp.moduleID)) {
        throw ImportError(this.file, node.source, 'failed to infer module identifier');
      }
      imp.moduleID = B.identifier(imp.moduleID);
    } else {
      node.specifiers.forEach(function (spec) {
        if (spec.type === 'ImportDefaultSpecifier') {
          // T.Identifier.assert(spec.id);
          imp.moduleID = spec.id;
        } else if (spec.type === 'ImportNamespaceSpecifier') {
          imp.moduleID = spec.id;
        } else {
          T.ImportSpecifier.assert(spec);
          // T.Identifier.assert(spec.id);
          var asID = spec.name ? spec.name : spec.id;
          imp.members.push({srcID:spec.id, asID:asID});
        }
      });
    }

    // Add IDs to importIDs so we can keep track of duplicates/conflicts
    if (!this.file.importIDs) this.file.importIDs = {};
    (moduleID ? [moduleID]:[]).concat(imp.members.map(function(m) { return m.asID; }))
      .forEach((function (id) {
        var previousImp = this.file.importIDs[id.name];
        if (previousImp) {
          throw ExportError(this.file, id, 'duplicate import identifier "'+id.name+'"', null, [
            { message: 'also imported here',
              srcloc:  SrcLocation(previousImp.node, previousImp.file) },
          ]);
        }
        this.file.importIDs[id.name] = imp;
      }).bind(this));

    // Append this import to list of imports for this specific pkgref
    var imports = this.pkg.imports[imp.ref];
    if (!imports) {
      this.pkg.imports[imp.ref] = [imp];
    } else {
      imports.push(imp);
    }

    // Remove from AST
    path.replace(null);

    this.traverse(path);
  },


  registerExport: function(id) {
    var existingExp = this.pkg.exports[id.name];
    if (existingExp) {
      throw ExportError(
        this.file,
        id,
        'duplicate exported identifier "'+id.name+'"',
        null,
        [{ message: 'also declared here',
           srcloc:  SrcLocation(existingExp.node, existingExp.file) }]
      );
    }
    this.pkg.exports[id.name] = {node:id, file:this.file};
    // body.push(`exports.id = id`)
    // console.log('XXX', inspect(id, {depth:1}));
    this.currentPath.parent.value.body.push(
      B.expressionStatement(
        B.assignmentExpression(
          '=',
          B.memberExpression(
            B.identifier('exports'),
            B.identifier(id.name),
            /*computed=*/false
          ),
          id
        )
      )
    );
  },


  visitExportDeclaration: function(path) {
    var node = path.node, decl;
    // console.log('ExportDeclaration', inspect(node, {depth:6}));

    // export must appear in program body
    if (path.parent.name !== 'program') {
      throw ExportError(this.file, node, 'unexpected export inside '+path.parent.value.type);
    }

    // Traverse now, as we might unbox export to var, and that would trigger a second
    // export registration if the var has an UpperCase identifier.
    this.traverse(path);

    // interface Spec {id:string, node:ASTNode}
    var exp = {
      'default':  node.default,
      specifiers: [],
      node:       node,
    };

    if (exp.default) {
      // Default (which we currently do nothing with)
      if (this.file.defaultExport) {
        throw ExportError(this.file, node, 'duplicate default export', null, [
          { message: 'also declared here',
            srcloc:  SrcLocation(this.file.defaultExport.node, this.file.defaultExport.file) }
        ]);
      }
      this.file.defaultExport = exp;

      // `export default function a(){}` => `function a(){}`
      // `export default class a {}` => `class a {}`
      // `export default function (){}` => ``
      // `export default {a:1}` => ``
      if (node.declaration.type === 'FunctionDeclaration' ||
          node.declaration.type === 'ClassDeclaration') {
        path.replace(node.declaration);
      } else {
        // TODO: figure out what this means, "this" being something like:
        //          `export default {a:1, b:2}`
        path.replace(null);
      }

    } else if (decl = node.declaration) {
      if (decl.type === 'VariableDeclaration') {
        // E.g. `export var foo, bar`
        decl.declarations.forEach((function(decl) {
          this.registerExport(decl.id);
        }).bind(this));
      } else if (decl.type === 'ClassDeclaration') {
        // E.g. `export class lol {}`
        this.registerExport(decl.id);
      } else if (decl.type === 'FunctionDeclaration') {
        // E.g. `export function lol() {}`
        // Note: `export function () {}` is invalid, so will never happen
        this.registerExport(decl.id);
      } else {
        throw ExportError(this.file, node, 'unexpected export operand '+decl.type);
      }

      // `export var x` => `var x`
      path.replace(node.declaration);

    } else if (node.specifiers.length !== 0) {
      // E.g. `export {a, b}`
      // This means that we should export something which is reachable as spec.id
      // at this location.
      node.specifiers.forEach((function(spec) {
        this.registerExport(spec.id);
      }).bind(this));

      // `export {a}` => ``
      path.replace(null);
    }

  },


  // export UpperCased vars in program body
  visitVariableDeclaration: function(path) {
    if (path.parent.name === 'program') {
      var i, c0, id, decls = path.node.declarations;
      for (i = 0; i !== decls.length; ++i) {
        id = decls[i].id;
        c0 = id.name[0];
        if (c0 === c0.toUpperCase()) {
          this.registerExport(id);
        }
      }
    }
    if (this.needToCallTraverse) this.traverse(path);
  },


  // export UpperCased classes and functions in program body
  _exportUpperCased: function(path) {
    if (path.parent.name === 'program') {
      var c0 = path.node.id.name[0];
      if (c0 === c0.toUpperCase()) {
        this.registerExport(path.node.id);
      }
    }
    if (this.needToCallTraverse) this.traverse(path);
  },

  visitClassDeclaration: function(path){ this._exportUpperCased(path); },
  visitFunctionDeclaration: function(path){ this._exportUpperCased(path); },

};
