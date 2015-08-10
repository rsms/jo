import 'assert'
import {MatchOR} from 'testing'

var _ = assert; // to silence errors of unused

function _TestParseSimple(t) {
  var f = ParseExpr('foo()')
  // t.log(f.ast);
  t.assertStructEQ(f.ast, {
    type: 'Program', body: [
      { type: 'ExpressionStatement', expression: {
          type: 'CallExpression', callee: {type: 'Identifier', name: 'foo'}, arguments: [] }
      },
    ]
  });
}


function _TestParseMacro(t) {
  let f = ParseExpr('macro A -> B; A')
  // t.log(f.ast)
  t.assertStructEQ(f.ast, {
    type: 'Program', body: [
      MatchOR(
        {type:'Noop'},
        {type:'MacroDefinition'},
      ),
      { type: 'ExpressionStatement', expression: { type: 'Identifier', name: 'B' } }
    ]
  });
}


async function _TestParseFile(t) {
  var f = await ParseFile(new FileSet, 'test_fixtures/src1.js');
  // t.log(f);
  t.assertStructEQ(f.ast, {
    type: 'Program', body: [
      { type: 'ExpressionStatement', expression: { // foo(1)
          type: 'CallExpression', callee: {type: 'Identifier', name: 'foo'}, arguments: [
            { type: 'Literal', value: 1 } ] }
      },
    ]
  });
}


async function TestParseDir(t) {
  var pkg = await ParseDir(new FileSet, 'test_fixtures/foo');
  t.log(pkg);
}

