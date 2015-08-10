import {types as t} from 'npmjs.com/babel-core'

class Helper_enum {
  constructor() {
    this._memberID = Object.freeze(t.identifier('jo_enum'));
  }

  accessNode(rtID:ASTNode) {
    return t.memberExpression(rtID, this._memberID);
  }

  gen() { //:[code:string, map?:SourceMap]
    let code =`{
  __n: Symbol(),
  toString: function(){
    return "[enum "+(this[this.__n] ? this[this.__n] + " {" : "{")+Object.keys(this)+"}]";
  },
  toJSON: function() { return Object.keys(this); }
};`;
    return [code, null];
  }
}
