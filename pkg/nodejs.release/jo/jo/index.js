#!/usr/bin/env node --harmony
var __$r=function(){__$r=require("path").dirname(__dirname);},__$lrt=function(ref){if(typeof __$r!=="string"){__$r();}return require(__$r+"/node_modules/"+ref);},__$i=global.__$i=function(m){return m && m.__esModule ? (m["default"] || m) : m; },__$iw=global.__$iw=function(m){return m && m.__esModule ? m : {"default":m}; },__$p,__$fex=require("fs").existsSync,__$lpkg=function(q,ref){var i,d,v;if(!__$p){if(typeof __$r!=="string"){__$r();}d="/pkg/nodejs.release/";__$p=[__$r+d];if(v=process.env.JOPATH){v=v.split(":");for(i in v){if(v[i])__$p.push(v[i]+d);}}}for(i in __$p){d=__$p[i]+ref+"/index.js";if(__$fex(d)){return q(d);}}return q(ref);};global.__$irt=function(r){return __$i(__$lrt(r));};__$irt("source-map-support").install();global.__$im=function(q,r){return __$i(__$lpkg(q,r));};global.__$imw=function(q,r){return __$iw(__$lpkg(q,r));};
//#jopkg{"files":["main.js"],"imports":["jo","jo/util"],"exports":[],"babel-runtime":["helpers/sliced-to-array"],"version":"ibvq2o04","main":true}
var _slicedToArray = __$irt("babel-runtime/helpers/sliced-to-array")
  , _main_js$Mainv = __$im(require,"jo").Mainv
  , _$$0 = __$im(require,"jo/util")
  , _main_js$SrcError = _$$0.SrcError
  , _main_js$ParseOpt = _$$0.ParseOpt;
"use strict";

function main(argv) {
  _main_js$Mainv(argv)["catch"](function (err) {
    if (_main_js$SrcError.canFormat(err)) {
      console.error(_main_js$SrcError.format(err));
    } else {
      var _ParseOpt$prog = _main_js$ParseOpt.prog(process.argv);

      var _ParseOpt$prog2 = _slicedToArray(_ParseOpt$prog, 2);

      var prog = _ParseOpt$prog2[0];
      var _ = _ParseOpt$prog2[1];

      console.error(prog + ":", err.stack || err);
    }
    process.exit(1);
  });
}
//#sourceMappingURL=index.js.map
