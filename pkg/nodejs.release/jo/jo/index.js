#!/usr/bin/env node --harmony
require("source-map-support").install();var __$fex=require("fs").existsSync,__$p,__$lpkg=function(q,ref){var i,d,v;if(!__$p){d="/pkg/nodejs.release/";__$p=[(process.env.JOROOT||require("path").dirname(__dirname))+d];if(v=process.env.JOPATH){v=v.split(":");for(i in v){if(v[i])__$p.push(v[i]+d);}}}for(i in __$p){d=__$p[i]+ref+"/index.js";if(__$fex(d)){return q(d);}}return q(ref);},__$i=global.__$i=function(m){return m && m.__esModule ? (m["default"] || m) : m; },__$iw=global.__$iw=function(m){return m && m.__esModule ? m : {"default":m}; };global.__$im=function(q,r){return __$i(__$lpkg(q,r));};global.__$irt=function(r){return __$i(require(r));};global.__$imw=function(q,r){return __$iw(__$lpkg(q,r));};
//#jopkg{"files":["main.js"],"imports":["jo","jo/util"],"exports":[],"babel-runtime":["helpers/sliced-to-array"],"version":"ibshhh1r","main":true}
var _slicedToArray = __$irt("babel-runtime/helpers/sliced-to-array")
  , _main_js$Mainv = __$im(require,"jo").Mainv
  , _$$0 = __$im(require,"jo/util")
  , _main_js$SrcError = _$$0.SrcError
  , _main_js$ParseOpt = _$$0.ParseOpt;
"use strict";

function main(argv) {
  _main_js$Mainv(argv)["catch"](function (err) {
    if (!_main_js$SrcError.canFormat(err)) {
      var _ParseOpt$prog = _main_js$ParseOpt.prog(process.argv);

      var _ParseOpt$prog2 = _slicedToArray(_ParseOpt$prog, 2);

      var prog = _ParseOpt$prog2[0];
      var _ = _ParseOpt$prog2[1];
    }
    process.exit(1);
  });
}
//#sourceMappingURL=index.js.map
