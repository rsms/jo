// E.g. `import {A as B} from "foo"`
// mkimport('foo', {'A':'B'});
function mkimport({ref, specs, node=null, isImplicit=false, srcfile=null}) {
  return {
    type: 'ImportDeclaration',
    jo_isImplicitImport:isImplicit,
    loc: node ? node.loc : null,
    source: {
      type: 'Literal',
      value: ref,
    },
    specifiers: Object.keys(specs).map(origName => {
      let local = null;
      if (specs[origName]) {
        local = { type: 'Identifier', name: specs[origName] };
      }
      let imported = null;
      if (origName !== 'default') {
        imported = { type: 'Identifier', name: origName };
      }
      return {
        start: null,
        type: 'ImportSpecifier',
        local: local,
        imported: imported,
        srcfile: srcfile,
      };
    }),
  };
}
