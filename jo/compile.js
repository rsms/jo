"use strict";
var fsx = require('fs-extra');
var path = require('path');
var recast = require('recast');
var B = recast.types.builders;
var inspect = require('util').inspect;
// var SrcError = require('./srcerror');

// var ImportExportVisitor = require('./visitors/imports_exports');
// var ReturnVisitor = require('./visitors/return');
// var TypesVisitor = require('./visitors/types');
// var ScopeVisitor = require('./visitors/scope');
// var __DEV__Visitor = require('./visitors/__dev__');

import {
  ImportExportVisitor,
  ReturnVisitor,
  TypesVisitor,
  ScopeVisitor,
  __DEV__Visitor
} from './visitors'

import {JSIdentifier, SrcError, SrcLocation} from './util'

// interface SrcFile {
//   dir:string       // e.g. "/abs/path/foo"
//   relpath:string   // e.g. "foo/bar.js"
//   name:string      // e.g. "bar.js"
//   st:fs.Stat
//   files:SrcFile[]  // if st.isDirectory()
// }

// interface Pkg {
//   imports:{pkgref: [Import], ...},
//   exports:{identifier: Export, ...},
//   build:Build
//   files:SrcFile[]
// }

// interface SrcOrigin {
//   file:SrcFile
//   start:{line:int, column:int}
//   end:{line:int, column:int}
// }

// interface Import {
//   ref:string                      // e.g. `import "lol/foo"` => 'lol/foo'
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

// interface Build {
//   pkgdir:string    // e.g. "/abs/path"
//   output:string    // e.g. "/abs/path.html"
//   template:string  // e.g. "/abs/path.html"
// }

// interface Program {
//   usedHelpers:string[]  // e.g. ['class-call-check', 'inherits', 'create-class']
//   ast:AST
//   map:SourceMap
//   code:string
// }


class PkgCompiler {

  // (pkg:Pkg)
  constructor(pkg) {
    this.pkg = pkg
  }

  // async compile(srcfiles:SrcFile[]):{code:string, map:SourceMap}
  async compile(srcfiles) {
    // load code and ast for each source file of the package
    await this.parseFiles(srcfiles)

    // free up memory (per-file code only needed for error reporting during transformation)
    // srcfiles.forEach((file) => file.code = null)

    // console.log('———— imports: ————'); dumpPkgImports(this.pkg);
    // console.log('———— exports: ————'); dumpPkgExports(this.pkg);

    // join file ASTs
    var ast = joinAST(srcfiles);

    // add imports to top of AST
    addJSImports(this.pkg, ast);

    // pkginfo
    ast.program.body[0].comments = [
      B.line('#jopkg' + JSON.stringify(this.pkg.makePkgInfo())),
    ].concat(ast.program.body[0].comments || []);

    // codegen
    var result = recast.print(ast, {
      sourceMapName: this.pkg.id + '.js',
    });
    // console.log(result.map);
    // console.log(result.code);
    // process.exit(0);
    return result;
  }


  // async parseFiles(srcfiles:SrcFile[])
  parseFiles(srcfiles) {
    return Promise.all(srcfiles.map(async (file) => {
      let source = await fs.readFile(file.dir + '/' + file.name, 'utf8')
      file.code = source;
      try {
        file.ast = recast.parse(source, {sourceFileName: file.relpath, range: true })
        this.transformJS(file)
      } catch (e) {
        err = e;
        if (!err.file) err.file = file;
      }
    }))
  }


  // transformJS(file:SrcFile)
  transformJS(file) {
    //console.log('--- transformJS', file.relpath, '---');
    var astVisitor;

    // scope pass 1/2
    astVisitor = {pkg: this.pkg, file: file};
    for (let k in ScopeVisitor.declare) { astVisitor[k] = ScopeVisitor.declare[k]; }
    recast.visit(file.ast, astVisitor);

    // common
    astVisitor = {pkg: this.pkg, file: file};
    for (let k in commonVisitors) { astVisitor[k] = commonVisitors[k]; }
    recast.visit(file.ast, astVisitor);
  }

}


// joinAST(srcfiles:SrcFile[]):AST
function joinAST(srcfiles) {
  var ast;
  srcfiles.forEach((file) => {
    if (!ast) {
      ast = file.ast;
    } else {
      file.ast.program.body.forEach((n) => {
        if (n) ast.program.body.push(n)
      })
    }
  });
  return ast;
}


function dumpPkgImports(pkg) {
  // console.log('pkg.imports:', inspect(pkg.imports, {depth:3}));
  Object.keys(pkg.imports).forEach(function (pkgref) {
    console.log(pkgref + ' required at:');
    var imps = pkg.imports[pkgref];
    imps.forEach(function(imp) {
      var loc = imp.node.loc.start;
      console.log('  '+imp.file.name+':'+loc.line+':'+loc.column+
                  (imp.moduleID ? ' as '+imp.moduleID.name : ''));
      imp.members.forEach(function(member) {
        if (member.srcID.name !== member.asID.name) {
          console.log('    • '+member.srcID.name+' as '+member.asID.name);
        } else {
          console.log('    • '+member.srcID.name);
        }
      });
    });
  });
}

function dumpPkgExports(pkg) {
  // console.log('pkg.exports:', inspect(pkg.exports, {depth:3}));
  Object.keys(pkg.exports).forEach(function(id) {
    var exp = pkg.exports[id];
    var loc = exp.node.loc.start;
    console.log(id+' exported from '+exp.file.name+':'+loc.line+':'+loc.column);
  })
}


// Imports in a nutshell:
//
// Form 1:
//  L(import S from P)
//     _                          _                            _
//  at Location there needs to be Symbol which is an alias for Package
//
// Form 2:
//  L(import {S+} from P)
//     _                          _                                         _             _
//  at Location there needs to be Symbol(s+) which is an alias for exported Symbol(s+) in Package
//

// addJSImports(pkg:Pkg, ast:AST)
function addJSImports(pkg, ast) {
  // for each imported package:
  Object.keys(pkg.imports).forEach(function (pkgref) {
    var imps = pkg.imports[pkgref];

    // Find any moduleIDs
    var moduleIDs; // {idname:Identifier}[] -- non-null if any srcfile needs the module itself
    var moduleMembers = [];
    var membersMap = {};  // {asID: srcID} -- union of all imps' moduleMembers
    imps.forEach(function (imp) {
      if (imp.moduleID) {
        if (!moduleIDs) moduleIDs = {};
        moduleIDs[imp.moduleID.name] = imp.moduleID;
      }
      imp.members.forEach(function(member){
        if (membersMap[member.asID.name] !== member.srcID.name) {
          membersMap[member.asID.name] = member.srcID.name;
          moduleMembers.push(member);
        }
      });
    });

    var i, varDecls;
    var requireExpr = B.callExpression(B.identifier('require'), [ B.literal(pkgref) ]);

    if (moduleIDs) {
      // `var moduleID = require("ref") ...`

      // {idname:Identifier}[] -> Identifier[]
      moduleIDs = Object.keys(moduleIDs).map(function(k) { return moduleIDs[k]; });

      // Pick _one_ module id for the require
      var moduleID = moduleIDs[0];

      // `var moduleID = require("ref")`
      varDecls = [
        B.variableDeclarator(moduleID, requireExpr)
      ];
      // add non-primary module IDs
      for (i = 1; i !== moduleIDs.length; ++i) {
        // `altModuleID = moduleID`
        varDecls.push(B.variableDeclarator(moduleIDs[i], moduleID));
      }
      // add module member IDs
      for (i = 0; i !== moduleMembers.length; ++i) {
        varDecls.push(
          B.variableDeclarator(
            moduleMembers[i].asID,
            B.memberExpression(moduleID, moduleMembers[i].srcID, false)
          )
        );
      }

      ast.program.body.splice(0,0, B.variableDeclaration('var', varDecls));
    } else {
      // `var A, B`
      varDecls = moduleMembers.map(function(m) { return m.asID; });
      ast.program.body.splice(0,0, B.variableDeclaration('var', varDecls));

      // `(function(m) { A = m.A; B = m.B; })(require("foo"));`
      var unexposedModuleID = B.identifier('m');
      ast.program.body.splice(1,0,
        B.expressionStatement(
          B.callExpression(
            B.functionExpression(
              null,
              [ unexposedModuleID ],
              B.blockStatement(moduleMembers.map(function (member) {
                // `A = m.A`
                return B.expressionStatement(
                  B.assignmentExpression(
                    '=',
                    member.asID,
                    B.memberExpression(
                      unexposedModuleID,
                      member.srcID,
                      false // computed
                    )
                  )
                );
              }))
            ),
            [ requireExpr ]
          )
        )
      );

    }
  });
}


// AST visitors.
// Build union of AST visitors used for each SrcFile
var commonVisitors = {}; [
  ScopeVisitor.resolve,  // scope pass 2/2
  TypesVisitor,
  ImportExportVisitor,
  ReturnVisitor,
  __DEV__Visitor,
].forEach(function(visitor) {
  Object.keys(visitor).forEach(function(k){
    var visitorFunc = visitor[k], existingVisitorFunc = commonVisitors[k];
    if (existingVisitorFunc) {
      commonVisitors[k] = function(path) {
        existingVisitorFunc.call(this, path);
        visitorFunc.call(this, path);
      };
    } else {
      commonVisitors[k] = visitorFunc;
    }
  });
});


// function analyzeCode(code) {
//   var spawn = require('child_process').spawn;
//   var proc = spawn(
//     'flow',
//     [
//       'check',
//       '--json',  // Output results in JSON format
//     ],
//     { 
//       cwd: __dirname,  // where our .flowconfig lives
//       stdio: [
//         'pipe',    // stdin
//         'pipe',    // stdout
//         2          // stderr
//       ],
//     }
//   );
//   proc.stdio[0].write(code, 'utf8');
//   proc.stdio[0].end();
//   proc.stdio[1].on('data', function (data) {
//     console.log('stdout: ' + data);
//   });
//   proc.on('close', function (code) {
//     console.log('flow exited ' + code);
//   });
// }


// wrapJSASTInVarCall(pkg:Pkg, ast:AST)
// function wrapJSASTInVarCall(pkg, ast) {
//   // wrap in `var pkgid = (function(){ ... })();`
//   var B = recast.types.builders;
//   ast.program.body = [
//     B.variableDeclaration(
//       "var", [
//         B.variableDeclarator(
//           B.identifier(pkg.id),
//           B.callExpression(
//             B.functionExpression(
//               B.identifier(pkg.id),
//               [], // args
//               B.blockStatement(
//                 ast.program.body
//               )
//             ),
//             []//B.emptyExpression() // callExpression args
//           )
//         )
//       ]
//     )
//   ];
// }
