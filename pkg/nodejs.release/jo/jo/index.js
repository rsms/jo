#!/usr/bin/env node --harmony
var _$JOROOT=(process.env.JOROOT||require("path").dirname(__dirname));Array.prototype.splice.apply(module.paths,[0,0,_$JOROOT+"/pkg/npm",_$JOROOT+"/pkg/nodejs.release"]);
require('source-map-support').install();
//#jopkg{"files":["main.js"],"imports":["jo","jo/util"],"exports":[],"babel-runtime":["helpers/sliced-to-array"],"version":"ibs535md","main":true}
var _$import = function(ref) { var m = require(ref); return m && m.__esModule ? m["default"] || m : m;}
, _$importWC = function(ref) { var m = require(ref); return m && m.__esModule ? m : {"default":m};}
  , _slicedToArray = _$import("babel-runtime/helpers/sliced-to-array")
  , _main_js$Mainv = _$import("jo").Mainv
  , _$$0 = _$import("jo/util")
  , _main_js$SrcError = _$$0.SrcError
  , _main_js$parseopt = _$$0.parseopt;
"use strict";

function main(argv) {
  _main_js$Mainv(argv)["catch"](function (err) {
    if (!_main_js$SrcError.canFormat(err)) {
      var _parseopt$prog = _main_js$parseopt.prog(process.argv);

      var _parseopt$prog2 = _slicedToArray(_parseopt$prog, 2);

      var prog = _parseopt$prog2[0];
      var _ = _parseopt$prog2[1];
    }
    process.exit(1);
  });
}
//#sourceMappingURL=index.js.map
