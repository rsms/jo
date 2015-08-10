Jo is a [Go-style](http://golang.org/doc/code.html#Introduction) JavaScript ES6 compiler and packager, based on [Babel](http://babeljs.io/).

> THIS IS WORK IN PROGRESS

- Go-style *[convention over configuration](https://en.wikipedia.org/wiki/Convention_over_configuration)* means Jo is straight-forward and opinionated
- Modules are comprised of directories, not files
- Built-in linting will tell you about usage of undefined variables, etc
- Compilation and compatibility fills provided by well-tested Babel
- Separation of target code generation allows building both Nodejs code and web browser code, for optimal performance and linting

Jo comes precompiled and can be used from source:

```
$ ./bin/jo help
```

Or installed via [npm](https://www.npmjs.com/package/jo):
```
$ npm install -g jo
$ jo help
```

For hacking on Jo, Jo builds itself, like a true compiler:
```
$ ./bin/jo-g env
-bash: bin/jo-g: No such file or directory
$ ./bin/jo build -dev -v jo/jo
building source package jo/jo
...
$ ./bin/jo-g env
JOPATH=""
JOROOT="/Users/rasmus/src2/jo"
```


## Automatic package-internal vs exported symbols

Like Go, Jo automatically exports symbols that begin with a captial letter:

foo/info.js
```js
var Version = '1.2'
function Name() { return 'Foo' }
var something = 123
```

bar/bar.js
```js
import 'foo'
function main() {
  console.log(foo.Version)   // -> "1.2"
  console.log(foo.Name())    // -> "Foo"
  console.log(foo.something) // -> undefined
}
```

However, any symbol can be explicitly exported:

```js
export var something = 123
```

All symbols inside a package are automatically available within all source files of that package:

foo/a.js
```js
var a = 100
```

foo/b.js
```js
function main() {
  console.log(a)  // -> 100
}
```

This means that you can start small by building your software with a single file and as it grows create new files, rename files etc without any side-effects on other source files or other packages.

Value dependencies are automatically resolved, meaning that this is possible:

foo/ape.js
```js
class Ape extends Primate {}
```

foo/primate.js
```js
class Primate {}
```

Which would compile to something like this:

```js
// import _classCallCheck and _inherits from babel-runtime/helpers
"use strict";
var Primate = function Primate(){
  _classCallCheck(this, Primate);
};
var Ape = (function(_Primate){
  function Ape(){
    _classCallCheck(this, Ape);
    if (_Primate != null){
      _Primate.apply(this, arguments);
    }
  }
  _inherits(Ape, _Primate);
  return Ape;
})(Primate);
exports.Primate = Primate;
exports.Ape = Ape;
```

## File-local imports

Just like in Go, imports are *file local* and does not affect an entire package:

foo/a.js
```js
import {Hello} from 'something'
var Message = Hello;
```

foo/b.js
```js
var OtherMessage = Hello;
```

```
$ jo build
./b.js:1:19 unresolvable identifier "Hello" (ReferenceError)
 →  1  var OtherMessage = Hello;
                          ^~~~~
```

Meaning this is valid:

foo/b.js
```js
import {Hello} from 'something-else'
var OtherMessage = Hello;
```

Now the "foo" package builds and exports `Message` with the value of `Hello` of package "something", and `OtherMessage` with the value of `Hello` of package "something-else".

File-local identifiers are internally converted to `_filename$originalname`. When multiple files import the same package or some combination of specific package symbols and packages, Jo figures out the minimal amount of imports needed:

foo/a.js
```
import {A} from 'some/thing'
```

foo/b.js
```
import 'some/thing'
```

foo/c.js
```
import {A, B} from 'some/thing'
```

The final code contains only a single import:

```
$ jo build -o=-
...
  , _b_js$thing = _$import("some/thing")
  , _a_js$A     = _b_js$thing.A
  , _c_js$A     = _b_js$thing.A
  , _c_js$B     = _b_js$thing.B
...
```

## Catching programming errors during compilation

Since Jo compiles your code it already needs to understand it and while doing so also checks for a bunch of common programming errors like usage of undefined symbols or cyclic dependencies:

foo/ape.js
```js
class Ape extends Primate {}
```

foo/primate.js
```js
class Primate extends Ape {}
```

Jo will tell us that we screwed up:

```
$ jo build
cyclic dependency between source files "primate.js" and "ape.js" in package "." (ReferenceError)
./ape.js:1:0 "Ape" defined here
 →  1  class Ape extends Primate {}
       ^~~~~~~~~~~~~~~~~~~~~~~~~~~~
    ./primate.js:1:22 "Ape" referenced here
     →  1  class Primate extends Ape {}
                                 ^~~
    ./primate.js:1:0 "Primate" defined here
     →  1  class Primate extends Ape {}
           ^~~~~~~~~~~~~~~~~~~~~~~~~~~~
    ./ape.js:1:18 "Primate" referenced here
     →  1  class Ape extends Primate {}
                             ^~~~~~~
```

Jo isn't perfect and doesn't handle the following case:

foo/ape.js
```js
class Ape extends Primate {}
class Bob {}
```

foo/primate.js
```js
class Primate {}
class Funny extends Bob {}
```

output:
```
$ jo build
cyclic dependency between source files "primate.js" and "ape.js" in package "." (ReferenceError)
./ape.js:2:0 "Bob" defined here
    1  class Ape extends Primate {}
 →  2  class Bob {}
       ^~~~~~~~~~~~
    ./primate.js:2:20 "Bob" referenced here
        1  class Primate {}
     →  2  class Funny extends Bob {}
                               ^~~
    ./primate.js:1:0 "Primate" defined here
     →  1  class Primate {}
           ^~~~~~~~~~~~~~~~
    ./ape.js:1:18 "Primate" referenced here
     →  1  class Ape extends Primate {}
                             ^~~~~~~
```

In this scenario, simply break out the classes into separate files.

Another common programming error that Jo helps you avoid is using undefined variables:

foo/ape.js
```js
class Primate {}
var Primat;
class Ape extends primate {}
```

```
$ jo build
./ape.js:3:18 unresolvable identifier "primate" (ReferenceError)
    1  class Primate {}
    2  var Primat;
 →  3  class Ape extends primate {}
                         ^~~~~~~
  Did you mean:
    Primate defined in ./ape.js:1:0
    Primat defined in ./ape.js:2:4
```

The same goes for duplicate identifiers within a package:

foo/a.js
```js
var x;
```

foo/b.js
```js
function x() {}
```

output:
```
$ jo build
./b.js:1:9 duplicate identifier in function declaration (ReferenceError)
 →  1  function x() {}
                ^
    ./a.js:1:4 var declared here
     →  1  var x;
               ^
```


## Import statements

Like Go, Jo dictates where dependency packages are located. When a non-relative import is encountered, Jo looks for the package in the following places:

1. JOROOT/src
2. JOPATH[0]/src
3. JOPATH[n]/src ...

> Internally, this logic is contained within `Env`

As ES6 does not specify the effect of the `import` statement (only the syntax), Jo attempts to be as flexible as possible to allow as many meningful forms as possible.

One of the forms usually not understood by other ES6 systems is the short form (matching Go). The following statements are both equivalent:

```js
import "foo/bar"
import bar from "foo/bar"
```

The first form import the "default" namespace of the module into an inferred name based on the package's ref (i.e. "bar"). How the name is inferred from follows the rules of Go.

```
"bar"                        => bar
"foo/bar"                    => bar
"foo/bar-baz"                => baz
"foo/bar-baz.js"             => baz
"github.com/rsms/jo-leveldb" => leveldb
"foo/-"                      Error: failed to infer module identifier
```

> The inferred-name logic is defined in `JSIdentifier.fromString`

Both "ref" imports (e.g. "foo") and relative imports (e.g. "./foo") are checked at compile-time for existence, though there are no guarantees of runtime behaviour as they are loaded from disk for the "nodejs" code target (the "browser" target makes copies.)

Example of various import statements:

```js
import "some/thing"
import {Component} from "some/thing"
import react from "./my-react"
import {Anne, Bob} from "friends"
import foes, {Zorro, Baltazhar as BMan} from "foes"
import * as cats from "lolcats"
```


## Automatic package dependency resolution

Jo automatically checks and builds any dependency packages

foo/a.js
```js
import "bar"
```

bar/a.js
```js
import "react"
```

```
$ cd foo
$ jo build -v
building source package .
  building source package bar
    building precompiled package react
```

Depending on the primary package and build target (in the above case the current directory for nodejs) dependencies are stored next to its source JOROOT or JOPATH, embedded locally for "browser" target, or in a nodejs target's "node_modules" directory. Packages are only recompiled when its source code changes (or when passing the "-a" flag to build), meaning that your workflow is simply:

```
$ jo build
```


## init()

Because of Jo packages being composed of a variable number of files which order is undefined, there's no clear way of running package initialization code, code that needs to be run when the package's module is imported. In a traditional module this is not a problem as a traditional module is just a single file, so you just add your initialization code to the end of the file, but with Jo packages this isn't possible when more than one file is used.

> init is called after all the variable declarations in the package have evaluated their initializers, and those are evaluated only after all the imported packages have been initialized. Any init functions are called before any main function is called.

Go solves this by allowing each file to define an "init" function, and so does Jo:

foo/a.js
```js
function init() { console.log('value =', value); }
```

foo/b.js
```js
var value = 123;
```

```
$ jo build && node foo
value = 123
```

## main()

If a package defines a function called `main` that function is automatically invoked when the package's product is executed.

For the "nodejs" (default) build target, this means that the product is an executable program:

foo/a.js
```js
function main() {
  console.log('hello ' + what)
}
```

foo/b.js
```js
var what = 'world'
```

```
$ go build
$ ./foo
hello world
```

foo/foo
```js
#!/usr/bin/env node --harmony
//module.paths is updated with any paths for finding babel helpers and source map support
function main() {
  console.log('hello world')
}
var what = 'world';
main();
```

For the "browser" target—for building web pages—the product is a collection of files with "index.html" being the entry-point, generated from "index.template.html":

foo/index.template.html
```html
<!DOCTYPE HTML>
<html lang="en">
  <head>
    <meta charset="utf-8">
  </head>
  <body>
    Hello
  </body>
</html>
```

foo/main.js
```js
function main() {
  document.body.innerText = 'Hello world'
}
```

```
$ go build -target=browser
```


foo/index.html
```html
<!DOCTYPE HTML>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <script type="text/javascript">
    _$jomodules = {};
    (function(){
      // Code to load all packages, resolve imports and finally invoke any main() function
      lm(".jopkg.foo.js?ibmqga6g");
      lm(".jopkg.babel-runtime.js?ibo35xco");
    })();
    </script>
  </head>
  <body>
    Hello
  </body>
</html>
```

All dependencies, including the main package's compiled code, are stored in the output directory prefixed by ".jopkg.*". This makes "browser" products self-contained and easily relocatable.


## Built-in React support

- JSX compiler with linting
- No need to explicitly import React

foo/a.js
```js
class Foo extends ReactComponent {
  render() {
    return <div>Hello</div>;
  }
}
```

```js
$ jo build -o=-
//[header with import of some babel-runtime/helpers]
var React = _$import("react"), ReactComponent = React.Component;
var Foo = (function(_ReactComponent){
  function Foo(){
    _classCallCheck(this, Foo);
    if (_ReactComponent != null){
      _ReactComponent.apply(this, arguments);
    }
  }
  _inherits(Foo, _ReactComponent);
  _createClass(Foo, {
    render:{
      value:function render(){
        return React.createElement("div", null, "Hello");
      }
    }
  });
  return Foo;
})(ReactComponent);
exports.Foo = Foo;
//#sourceMappingURL=data...
```


## MIT license

Copyright (c) 2015 Rasmus Andersson <http://rsms.me/>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
