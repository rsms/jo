import {inspect} from 'util'
import babel from 'npmjs.com/babel-core'

// Token metadata keys
const TokenVarTag    = Symbol('MacroTokenVarTag')
    , MatchingToken  = Symbol('MacroMatchingToken')
    , MemoizedResult = Symbol('MacroMemoizedResult')

// Token TokenVarTag values
const TokenVar1 = Symbol('MacroTokenVar1') // $x
    , TokenVarN = Symbol('MacroTokenVarN') // ...$x

const ccDollar = '$'.charCodeAt(0)
    , ccGreaterThan = '>'.charCodeAt(0)

const kEmpty   = Symbol()
    , kPattern = Symbol()
    , kBody    = Symbol()

var tokTypes = (babel.babylon || babel.acorn).tokTypes;

// FmtMacroPat formats a macro pattern into a printable string
function FmtMacroPat(p:MacroPattern, behaviour?:kPattern|kBody, style?:Function|false) { //:string
  var source = '', toks = p.tokens;
  if (style === undefined) { style = color; } else if (!style){style=function(a,b){return b||a}}
  if (toks.length > 0) {
    source = toks.map(function(t) {
      if (t.value !== undefined) {
        return (
          t[TokenVarTag] ? (
            t[TokenVarTag] === TokenVarN ? style('90','...') : ''
          ) + style('b', t.value) :
          style('g',t.value)
        );
      }
      return t.type.label;
    }).join(' ');
  }
  return source ? style('90','{ ') + style(source) + style('90',' }') : style('90','{}');
}

// FmtMacro formats a macro into a printable string
function FmtMacro(m:MacroDef, style?:Function|false) { //:string
  if (style === undefined) { style = color; } else if (!style){style=function(a,b){return b||a}}
  return FmtMacroPat(m.pattern, kPattern, style) +
         style('y',' -> ') + FmtMacroPat(m.body, kBody, style);
}


function tokeq(t1:Token, t2:Token) {
  return t1.type === t2.type && t1.value === t2.value;
}


function fmttok(t) {
  var tl;
  if (t.type.label) {
    tl = color('y', t.type.label[0].match(/[A-Za-z$]/) ? t.type.label : inspect(t.type.label));
  } else {
    tl = color('b', inspect(t.type));
  }
  return '('+tl + (
    t.value === undefined ? '' :
    ' ' + (
      t[TokenVarTag] ? (t[TokenVarTag] === TokenVarN ? color('90','...') : '') +
        color('b',t.value) :
      inspect(t.value, {colors:true})
    )
  ) +')';
}
