// Strips interfaces (as babel doesn't support it)
import assert from 'assert'

function SyntaxError(file, node, message, fixSuggestion, related) {
  return SrcError('SyntaxError', SrcLocation(node, file), message, fixSuggestion, related);
}

function LogicError(file, node, message, fixSuggestion, related) {
  return SrcError('LogicError', SrcLocation(node, file), message, fixSuggestion, related);
}

function TypeError(file, node, description, fixSuggestion, related) {
  return SrcError('TypeError', SrcLocation(node, file), description, fixSuggestion, related);
}


var base = {

  scopeSetFunc: function(scope) {
    var prevScope = this.pkg._blockScope;
    this.pkg._funcScope = scope;
    return prevScope;
  },
  scopeSetBlock: function(scope) {
    var prevScope = this.pkg._blockScope;
    this.pkg._blockScope = scope;
    return prevScope;
  },

  scopePushFunc: function() {
    return this.pkg._funcScope = Object.create(this.pkg._blockScope);
  },
  scopePushBlock: function() {
    return this.pkg._blockScope = Object.create(this.pkg._blockScope);
  },

  scopePopFunc: function() {
    this.pkg._funcScope  = this.pkg._funcScope.__proto__;
  },
  scopePopBlock: function() {
    this.pkg._blockScope = this.pkg._blockScope.__proto__;
  },
}

//————————————————————————————————————————————————————————————————————————————————————————————————

export var ScopeVisitor = {};
ScopeVisitor.declare = {
  // visitTYPE(path:NodePath)

  visitProgram: function(path) {
    if (!this.pkg._funcScope) {
      this.pkg._blockScope = this.pkg._funcScope = {};
    }
    // return B.blockStatement(path.node.body);
    this.traverse(path);
  },

  scopeDeclareInFunc: function(name, node) {
    this.pkg._funcScope[name] = node;
  },

  scopeDeclareInBlock: function(name, node) {
    this.pkg._blockScope[name] = node;
  },

  visitVariableDeclaration: function(path) {
    var scopeDeclare =
      (path.node.kind === 'let') ? this.scopeDeclareInBlock.bind(this) :
                                   this.scopeDeclareInFunc.bind(this);
    path.node.declarations.forEach(function(decl){ scopeDeclare(decl.id.name, decl); }, this);
    this.traverse(path);
  },

  visitFunctionDeclaration: function(path) {
    // console.log('[1] ENTER delcare function', path.node.id.name);
    // console.log('path.node.expression', path.node.expression);
    this.scopeDeclareInFunc(path.node.id.name, path.node);
    path.node.scope = this.scopePushFunc();
    this.traverse(path);
    this.scopePopFunc();
    // console.log('[1] EXIT declare function', path.node.id.name);
  },

  visitBlockStatement: function(path) {
    // console.log('[1] ENTER block');
    path.node.scope = this.scopePushBlock();
    this.traverse(path);
    this.scopePopBlock();
    // console.log('[1] EXIT block');
  },


};

//————————————————————————————————————————————————————————————————————————————————————————————————

function inspectCallable(callable) {
  if (callable.minArgc !== undefined) return;

  callable.hasTypeAnnotatedParams = false;
  var hasSeenOptionalParam = false;

  // Note: parser validates that any spread argument is the last argument in the list.

  callable.minArgc = callable.params.reduce((function (argc, param, i) {
    if (param.typeAnnotation) {
      callable.hasTypeAnnotatedParams = true;
    } else if (callable.hasTypeAnnotatedParams) {
      // When some params are type-annotated by some aren't
      throw SyntaxError(
        this.file,
        param,
        'missing type annotation for parameter in type-annotated parameter set'
      );
    }
    if (param.optional || callable.defaults[i] !== undefined) {
      hasSeenOptionalParam = true;
      return argc;
    } else if (hasSeenOptionalParam) {
      throw LogicError(this.file, param, 'required argument following optional argument');
    }
    return argc+1;
  }).bind(this), 0);

  if (callable.rest && (!!callable.rest.typeAnnotation) !== callable.hasTypeAnnotatedParams) {
    throw SyntaxError(
      this.file,
      callable.rest,
      'missing type annotation for rest parameter in type-annotated parameter set',
      'Use `...'+callable.rest.name+':any` to accept any types'
    );
  }

  callable.maxArgc = callable.rest ? Number.POSITIVE_INFINITY : callable.params.length;
}


var builtinTypeNames = {};  // i.e. {"[object Number]": "number", "[object Array]": "any[]", ...}
var builtinTypeNamesInv = {}; // inverse of builtinTypeNames

function obj2str(obj) {
  return Object.prototype.toString.call(obj);
}

function defBuiltinType(v, name) {
  var builtinName = obj2str(v);
  builtinTypeNames[builtinName] = name;
  builtinTypeNamesInv[name] = builtinName;
  return builtinName;
}

var builtinStringTypeName    = defBuiltinType("", "string");
var builtinFunctionTypeName  = defBuiltinType(function(){}, "function");
var builtinArrayTypeName     = defBuiltinType([], "any[]");
var builtinObjectTypeName    = defBuiltinType({}, "{}");
var builtinRegExpTypeName    = defBuiltinType(/./, "RegExp");
var builtinDateTypeName      = defBuiltinType(new Date, "Date");
var builtinNumberTypeName    = defBuiltinType(3, "number");
var builtinBooleanTypeName   = defBuiltinType(true, "bool");
var builtinNullTypeName      = defBuiltinType(null, "null");
var builtinUndefinedTypeName = defBuiltinType(void 0, "undefined");


function BuiltInType(name, range, loc) {
  return Object.create(BuiltInType.prototype, {
    type:  {value:'BuiltInType', enumerable:true},
    name:  {value:name, enumerable:true},
    range: {value:range||null, enumerable:true},
    loc:   {value:loc||null, enumerable:true},
  });
}
BuiltInType.prototype.isNumber = function() {
  return this.name === 'number' || this.name === 'int';
}


function TypeName(typeAnnotation) {
  var ta = typeAnnotation, name;
  switch (ta.type) {
    case 'BuiltInType': return ta.name;
    case 'AnyTypeAnnotation': return 'any';
    case 'VoidTypeAnnotation': return 'void';
    case 'NumberTypeAnnotation': return 'number';
    case 'StringLiteralTypeAnnotation': case 'StringTypeAnnotation': return 'string';
    case 'BooleanTypeAnnotation': return 'bool';
    case 'ArrayTypeAnnotation': return TypeName(ta.elementType)+'[]';

    case 'GenericTypeAnnotation': {
      if (ta.id.type === 'Identifier') {
        name = ta.id.name;
      } else { assert.ok(ta.id.type === 'QualifiedTypeIdentifier');
        name = TypeName(ta.id);
      }
      if (ta.typeParameters) {
        name += '<' + ta.typeParameters.params.map(TypeName).join(',') + '>';
      }
      return name;
    }

    case 'QualifiedTypeIdentifier':
      if (ta.qualification.type === 'QualifiedTypeIdentifier') {
        return TypeName(ta.qualification) + '.' + ta.id.name;
      } else {
        return ta.qualification.name + '.' + ta.id.name;
      }

    default: return ta.type;
  }
}


// resolveType(node:ASTNode):Type?
function resolveType(node) {
  return (node._effectiveType === undefined) ? (node._effectiveType = _resolveType(node)) :
                                               node._effectiveType;
}
function _resolveType(node) {
  if (node.typeAnnotation) {
    var ta = node.typeAnnotation.typeAnnotation;
    assert.ok(ta);
    switch (ta.type) {
      case 'GenericTypeAnnotation':
        if (ta.id.name === 'int' || ta.id.name in builtinTypeNamesInv) { // int, Date, RegExp, etc
          return BuiltInType(ta.id.name, ta.range, ta.loc);
        }
        break;
      case 'NumberTypeAnnotation':  return BuiltInType('number', ta.range, ta.loc);
      case 'StringTypeAnnotation':  return BuiltInType('string', ta.range, ta.loc);
      case 'BooleanTypeAnnotation': return BuiltInType('bool', ta.range, ta.loc);
    }
    return ta;

  } else if (node.type === 'Literal') {
    // "42", 42, true, /.+/
    var builtinTypeName = obj2str(node.value);
    //console.log('resolveType: node =', repr(node), 'builtinTypeName =', builtinTypeName);
    switch(builtinTypeName) {
      case builtinStringTypeName: return B.stringLiteralTypeAnnotation(node.value, node.value);
      case builtinNumberTypeName:
        if (node.value === Math.round(node.value)) { return BuiltInType('int'); }
        break;
    }
    return BuiltInType(builtinTypeNames[builtinTypeName]);
  }
  // TODO: resolve by traversing node
  // TODO: resolve identifier etc via scope
  return null;
}


// resolution visitors
ScopeVisitor.resolve = {

  warn: function(loc, msg) {
    console.warn(this.file.name+':'+loc.start.line+':'+loc.start.column+': warn: '+msg);
  },


  checkTypeIsAssignable: function(targetType, srcNode) {
    if (targetType) {
      // console.log('checkTypeIsAssignable: targetType =', repr(targetType));
      var srcType = resolveType(srcNode);
      // console.log('checkTypeIsAssignable: srcType =', repr(srcType));
      // console.log('targetType.check(srcNode):',
      //   types.namedTypes[targetType.type].check(srcNode.));

      if (!srcType) {
        // TODO: add warning to pkg and/or treat as diagnostics
        this.warn(srcNode.loc, 'value of unknown type being assigned as '+TypeName(targetType));
        return;
      }

      var file = this.file;
      var TypeErrorIncompatible = function(related) {
        return TypeError(
          file,
          srcNode,
          'incompatible types; can not assign '+TypeName(srcType)+' to '+TypeName(targetType),
          null,
          [{message:'target', srcloc:SrcLocation(targetType, file)}]
        );
      }

      switch (targetType.type) {

        case 'AnyTypeAnnotation': break;

        case 'StringTypeAnnotation':
        case 'StringLiteralTypeAnnotation': {
          if ( (srcType.type !== 'BuiltInType' || !srcType.isNumber()) &&
               srcType.type !== 'StringTypeAnnotation' &&
               srcType.type !== 'StringLiteralTypeAnnotation')
          {
            throw TypeErrorIncompatible();
          }
          break;
        }

        case 'BuiltInType': {
          switch (targetType.name) {
            case 'number': {
              if (srcType.type !== 'BuiltInType' || !srcType.isNumber()) {
                throw TypeErrorIncompatible();
              }
              break;
            }
            case 'string': {
              if ( (srcType.type !== 'BuiltInType' || !srcType.isNumber()) &&
                   srcType.type !== 'StringTypeAnnotation' &&
                   srcType.type !== 'StringLiteralTypeAnnotation' )
              {
                throw TypeErrorIncompatible();
              }
              break;
            }
            default: {
              if (srcType.type !== 'BuiltInType' || srcType.name !== targetType.name) {
                throw TypeErrorIncompatible();
              }
              break;
            }
          }
          break;
        }

        default: {
          this.warn(
            srcNode.loc,
            'value of unresolved type '+TypeName(srcType)+
              ' being assigned as '+TypeName(targetType)
          );
        }

        // case 'GenericTypeAnnotation': {
        //   switch (ta.id.name) {
        //     case 'int': {
        //       // if (srcType.type !== 'NumberTypeAnnotation')
        //     }
        //     case 'float': return B.numberTypeAnnotation();
        //     default: return ta;
        //   }
        // }

      }
    } // else: no target type == effectively "any"
  },


  visitFunctionDeclaration: function(path) {
    // console.log('[2] ENTER delcare function', path.node.id.name);
    var outerScope = this.scopeSetFunc(path.node.scope);
    this.traverse(path);
    this.scopeSetFunc(outerScope);
    // console.log('[2] EXIT declare function', path.node.id.name);
  },

  visitBlockStatement: function(path) {
    // console.log('[2] ENTER block');
    var outerScope = this.scopeSetBlock(path.node.scope);
    this.traverse(path);
    this.scopeSetBlock(outerScope);
    // console.log('[2] EXIT block');
  },

  visitCallExpression: function(path) {
    var callee = path.node.callee;
    if (callee.type === 'Identifier') {
      var targetCallable = this.pkg._blockScope[callee.name];
      if (targetCallable && callee.name === 'Hello') {
        //console.log('——————————————————————————————————————————————————————————————————————');
        // console.log(path.node.callee);
        // console.log('block:', repr(this.pkg._blockScope,1));
        // console.log('func:', repr(path.node));

        var args = path.node.arguments;
        inspectCallable.call(this, targetCallable);

        // Check minimum & maximum number of args
        if (args.length < targetCallable.minArgc) {
          throw LogicError(this.file, path.node,
            'too few arguments in call to function (need at least '+
            targetCallable.minArgc+')',
            null,
            [{message:'target function', srcloc:SrcLocation(targetCallable, this.file)}]
          );
        }
        if (args.length > targetCallable.maxArgc) {
          throw LogicError(this.file, path.node,
            'too many arguments in call to function (accepts no more than '+
            targetCallable.maxArgc+')');
        }

        // Check types
        if (targetCallable.hasTypeAnnotatedParams) {
          args.forEach((arg, i) => {
            var param = (i < targetCallable.params.length) ? targetCallable.params[i] :
                                                             targetCallable.rest;
            this.checkTypeIsAssignable(resolveType(param), arg); // throws
          });
        }

        // TODO: check targetCallable.rest
        // TODO: check targetCallable.params for ObjectPattern
        // TODO: resolve effective return type for the targetCallable

        // console.log('scope:', repr(this.pkg._scope, 1));
        // console.log('targetCallable:', repr(targetCallable));
        // console.log('args:', repr(args));
        // process.exit(0);
      }
    }
    this.traverse(path);
  },

};

//————————————————————————————————————————————————————————————————————————————————————————————————

for (var k in base) {
  ScopeVisitor.declare[k] = base[k];
  ScopeVisitor.resolve[k] = base[k];
}
