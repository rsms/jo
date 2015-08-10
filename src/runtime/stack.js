
type CallSite = {
  // returns the value of this
  getThis():any;

  // returns the type of this as a string. This is the name of the function stored in the
  // constructor field of this, if available, otherwise the object's [[Class]] internal property.
  getTypeName():string;

  // returns the current function
  getFunction():Function;

  // returns the name of the current function, typically its name property. If a name property is
  // not available an attempt will be made to try to infer a name from the function's context.
  getFunctionName():string;

  // returns the name of the property of this or one of its prototypes that holds the current
  // function
  getMethodName():string;

  // if this function was defined in a script returns the name of the script
  getFileName():string;

  // Returns the name of the resource that contains the script for the function for this
  // StackFrame or sourceURL value if the script name is undefined and its source ends with
  // //# sourceURL=... string or deprecated //@ sourceURL=... string.
  getScriptNameOrSourceURL():string;

  // if this function was defined in a script returns the current line number
  getLineNumber():int;

  // if this function was defined in a script returns the current column number
  getColumnNumber():int;

  // if this function was created using a call to eval returns a CallSite object representing
  // the location where eval was called
  getEvalOrigin():CallSite;

  // is this a toplevel invocation, that is, is this the global object?
  isToplevel():bool;

  // does this call take place in code defined by a call to eval?
  isEval():bool;

  // is this call in native V8 code?
  isNative():bool;

  // is this a constructor call?
  isConstructor():bool;
};


function Stack(fun?:Function) { //:CallSite[]
  var orig = Error.prepareStackTrace;
  Error.prepareStackTrace = function(_, stack){ return stack; };
  var err = new Error;
  Error.captureStackTrace(err, fun || Stack);
  var stack = err.stack;
  Error.prepareStackTrace = orig;
  return stack;
}


function FormatCallSite(cs:CallSite) {
  let file = cs.getFileName() || cs.getScriptNameOrSourceURL();
  let fn = cs.getFunctionName() || cs.getMethodName();
  return (fn || '?') + '\t' + file + ':' + cs.getLineNumber() + ':' + cs.getColumnNumber();
}


function FormatStack(stack:CallSite[], delimiter:string='\n') {
  let s = ''
  for (let cs of stack) {
    s += FormatCallSite(cs) + delimiter;
  }
  return s;
}
