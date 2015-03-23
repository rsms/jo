import React, {Component as ReactComponent} from 'react'

var Foo;
export var boo;

export default {a,b};

interface Animal<T> {
  name:string;
  foo:T;
  hello(times:T):string;
}
interface Person {
  name:string;
  age:int;
}

var a, b = 1;
let c = 2;

function say() {
  // var person = {name:"Anne"}; // todo: resolve in scope at call-site
  return Hello('Ann', 31)
}

function Hello(name:string, x:int=4, age?:int, ...lol:any):string {
  var hello = 'hello'
  var lolz;
  // something else
  var catson;
  return `${hello} ${name}!`
}

if (__DEV__) {
  console.log("let's play", say())
} else {
  console.log("do business", say())
}

class ProfilePhoto extends ReactComponent {
  render() {
    return <div style={{backgroundImage: 'url('+this.props.pic+')'}} />
  }
}
