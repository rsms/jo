import React, {Component as ReactComponent, X} from 'react'
// import 'bar/jo-foo.git'  // == import foo from ...
// import fo, {Foo, Babar, Baz} from './bar'
// import c, {A, B as Bob} from 'bar/some'
// let x = 1;
import {A, B as Bob} from 'bar/some'
// import react from 'react'
// import * as FS from 'fs'  // equiv to `import FS from 'fs'`
// import {ReactComponent as RC} from 'react'
// import {Foo, bar} from 'foo'

var a = A;

export default {a:1};
// export var foo = 1, bar;
// export class exp1 {}
// export function exp2() {}
// export {a, b as Bob}

var FunnyCats = 3;
var boringCats = 2, FunnyLions = 1;

class Bar extends ReactComponent {
  render() {
    var A = 123;
    return <p>Want a drink, {{A}}?</p>
  }
}

function MyCat3() {}


function b() {
  var value = React;
}

function c() {
  var React = 2;
  var value = React;
}
