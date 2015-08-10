import babel from 'npmjs.com/babel-core'
import babylonParser from 'npmjs.com/babel-core/node_modules/babylon/lib/parser'
import 'jo/ast/macro'
import fs from 'asyncfs'

// ParseResult is returned from a succeful call to Parse
type ParseResult = {
  ast:ASTProgram;
  macros:MacroDefs;
  diagnostics:Diagnostic[];
};

// Diagnostic describes a non-critical event or piece of potentially helpful information
// found during parsing.
type Diagnostic = {
  type:string;    // 'warn'|'info'
  message:string; // Human-readable description
  pos:int;        // start offset in source. -1 if not available.
  endPos:int;     // end offset in source. -1 if not available.
  loc?:SrcLoc;    // start and end line-and-column in source
};

type SrcLoc = {
  start:{line:int,column:int};
  end:{line:int,column:int};
};

// Mode modifies the behaviour of parsing
const ImportsOnly:Mode   = 1 << 0 // Stop parsing after import declarations
    , ParseComments:Mode = 2 << 1 // Parse and include comments in the AST
    , NoJSX:Mode         = 3 << 2 // Disable parsing of JSX
    , NoFlowTypes:Mode   = 4 << 3 // Disable parsing of Flow types
    , NoMacros:Mode      = 5 << 4 // Disable parsing and expansion of macros


// Parses source code into AST
interface Parser {
  mode:Mode;
  parse(fset:FileSet, filename:string, src:string):File;
}

// Creates a new parser
function CreateParser(mode?:Mode) { //:Parser
  var opts = {
    allowImportExportEverywhere: false,
    allowReturnOutsideFunction:  false,
    strictMode:                  false,
    sourceType:                  'module',
    allowReserved:               true,
    plugins: { jsx: 1, flow: 1 }, // TODO: set from babylonParser in some way
    features: {},
  };
  for (let k in babel.pipeline.transformers) {
    opts.features[k] = true;
  }
  if (mode & NoJSX) { delete opts.plugins.jsx; }
  if (mode & NoFlowTypes) { delete opts.plugins.flow; }
  let p = new babylonParser(opts, '');
  if (!(mode & NoMacros)) {
    macro.Plugin(p, {
      includeComments: (mode & ParseComments),
      includeDefinitions: true, // Generate MacroDefinition AST nodes instead of Noop nodes
    });
  }
  return configureFileParser(p, mode); // defined in file.js
}


// reusable parsers
var parsers; // Map<Mode,[Parser,ParseState]>

function getParser(mode?:Mode) { //:Parser
  let p;
  if (!parsers || !(p = parsers.get(mode))) {
    p = CreateParser(mode)
    if (!parsers) { parsers = new Map }
    parsers.set(mode, [p, Object.freeze(p.state.clone())])
  } else {
    p[0].state = p[1].clone();
    p = p[0];
  }
  return p;
}

// Parses a file loaded from and located at `filename`.
// If `src` is a string or Buffer, `filename` is only used to record positions in fset.
async function ParseFile(fset:FileSet, filename:string, src?:string, mode?:Mode):ast.File {
  if (src) {
    switch (typeof src) {
      case 'string': break;
      case 'object': src = src.toString('utf8'); break;
      default: throw new TypeError('src is not a string');
    }
  } else {
    src = await fs.readFile(filename, {encoding:'utf8'});
  }
  return getParser(mode).parse(fset, filename, src);
}

// Decide is a file is to be included in parsing of a directory.
// The st object contains a non-standard property: name:string; -- file's basename.
type FileFilter = (st:fs.Stat)=>bool;

// Default pattern for matching filenames considered source files
// Examples that match: "foo.js", "bar-lol cat.js"
// Examples that don't match: ".foo.js", "lol.foo"
var FilenamePattern = /^[^\.].*\.js$/;

// ParseDir calls ParseFile for all files with names ending in ".js" in the directory specified
// by path and returns a Pkg.
//
// If filterfn is provided, only the files with fs.Stat entries passing through the filter
// are considered. The mode bits are passed to ParseFile unchanged. Position information is
// recorded in fset.
//
async function ParseDir(fset:FileSet, dirname:string, filterfn?:FileFilter, mode?:Mode) { //:Pkg
  let files = [];
  await readdir(dirname, filterfn, async f => {
    files.push(await ParseFile(fset, dirname + '/' + f.name, null, mode))
  })
  files.sort((L, R) => R.name < L.name ? -1 : 1)
  return { // __proto__: Pkg.prototype
    dirname: dirname,
    files:   files,
  };
}


async function readdir(dirname, filterfn, cb) {
  let entries = await fs.readdir(dirname);
  let basepath = dirname + '/';
  await Promise.all(map(entries, async (filename, i) => {
    let f = await fs.stat(basepath + filename);
    if (f) {
      f.name = filename;
      if (filterfn) {
        if (!filterfn(f)) {
          return;
        }
      } else if (!FilenamePattern.test(filename)) {
        return;
      }
      await cb(f);
    }
  }))
}


function* filter(it, fn) {
  let i = 0;
  for (let v of it) { yield fn(v, i++) }
}

function* map(it, fn) {
  let i = 0;
  for (let v of it) { yield fn(v, i++) }
}

// let sources = await Promise.all(map(fset, f =>
//     fs.readFile(f, {encoding:'utf8'}) ))

// Convenience function to parse a source-code string
function ParseExpr(src:string, mode?:Mode) {
  return getParser(mode).parse(null, '<anon>', src)
}
