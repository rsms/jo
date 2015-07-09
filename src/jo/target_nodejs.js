import fs from 'asyncfs'
import path from 'path'
import {Unique} from './util'

class NodeJSTarget extends Target {
  constructor(id, mode, options) {
    super(id, mode, options);
    this.registerGlobals({
      'setImmediate':GLOBAL_STD,
      'setInterval':GLOBAL_STD,
      'setTimeout':GLOBAL_STD,
      'clearImmediate':GLOBAL_STD,
      'clearInterval':GLOBAL_STD,
      'clearTimeout':GLOBAL_STD,
      'Buffer':GLOBAL_STD,
      'console':GLOBAL_STD,
      'exports':GLOBAL_STD,
      'global':GLOBAL_STD,
      'module':GLOBAL_STD,
      'process':GLOBAL_STD,
      'require':GLOBAL_STD,
      '__dirname':GLOBAL_STD,
      '__filename':GLOBAL_STD,
    });
    this.registerBuiltInModules([
      'assert',
      'buffer',
      'child_process',
      'cluster',
      'console',
      'constants',
      'crypto',
      'dgram',
      'dns',
      'domain',
      'events',
      'freelist',
      'fs',
      'http',
      'https',
      'module',
      'net',
      'os',
      'path',
      'punycode',
      'querystring',
      'readline',
      'repl',
      'smalloc',
      'stream',
      'string_decoder',
      'sys',
      'timers',
      'tls',
      'tty',
      'url',
      'util',
      'vm',
      'zlib',
    ]);
  }

  get moduleType() {
    return 'common'
  }


  async preMake(pkgs:Pkg[]) {
    if (!pkgs[0].jopath) {
      var pkgdir = path.resolve(pkgs[0].dir);
      this.localNodeModulesDir = pkgdir ? pkgdir + '/node_modules' : null;
    }
  }


  moduleFilename(pkg:Pkg, depLevel:int) {
    if (!pkg.jopath) {
      if (depLevel === 0) {
        return null; // don't store or reuse intermediate code
      }
      if (this.localNodeModulesDir) {
        return this.localNodeModulesDir + '/' +
               (pkg.ref ? pkg.ref : path.resolve(pkg.dir).pop()) + '.js';
      }
    }
    return super.moduleFilename(pkg, depLevel);
  }

  transforms(transforms) {
    return super.transforms(transforms).concat([
      'asyncToGenerator',  // async/await. Requires Node.js >0.11.2
    ])
  }


  // Program destination
  programDstFile(pkg:Pkg) {
    if (this._programDstFile === undefined || this._programDstFile.pkg !== pkg) {
      var s;
      if (this.options.output) {
        s = this.options.output;
      } else if (pkg.jopath) {
        let progname = pkg.ref.split('/').pop();
        s = pkg.jopath + '/bin/' + progname + (this.isDevMode ? '-g' : '');
      } else {
        if (pkg.ref) {
          s = './' + pkg.ref;
        } else {
          s = './' + path.resolve(pkg.dir).split('/').pop();
        }
      }
      this._programDstFile = {pkg:pkg,v:s};
    }
    return this._programDstFile.v;
  }


  pkgModuleHeader(pkg:Pkg, depLevel:int) {
    if (depLevel === 0 && pkg.hasMainFunc) {
      // Building a program
      return this.programBootCode(pkg);
    }
  }


  genJOROOTInitCode(pkg:Pkg) {
    let bakedJOROOT;
    let dstDirAbs = path.dirname(path.resolve(this.programDstFile(pkg)));
    let isSelfJOProgram = false;
    if (dstDirAbs.indexOf(Env.JOROOT) === 0) {
      isSelfJOProgram = pkg.ref === 'jo/jo';
      bakedJOROOT = '__dirname+' +
        JSON.stringify(path.relative(dstDirAbs, Env.JOROOT)).replace(/^"/, '"/');
    } else {
      bakedJOROOT = JSON.stringify(Env.JOROOT);
    }
    return (

      // Note: When building ourselves (local "jo/jo") don't care about env.JOROOT.
      // This allows one jo program to build another jo program, for instance:
      //   JOROOT=/dev-jo /stable-jo/bin/jo build jo/jo
      //   /dev-jo/bin/jo
      // As dev-jo might contain pkgs which are incompatible with /stable-jo/bin/jo,
      // we must ensure that stable-jo loads its packages from /stable-jo/pkg rather
      // than JOROOT/pkg.
      (isSelfJOProgram ? '' : 'process.env.JOROOT||') +

      'require("path").' +
        (bakedJOROOT === '__dirname+"/.."' ? 'dirname(__dirname)' :
                                             'resolve(' + bakedJOROOT + ')')
    );
  }


  programBootCode(pkg:Pkg) {
    if (this._programBootCode && this._programBootCode.pkg === pkg) {
      return this._programBootCode.v;
    }

    // #!node
    let nodeArgs = ' --harmony';
    if (this.isDevMode) {
      nodeArgs += ' --stack-trace-limit=25';
    }
    let shebang = '#!/usr/bin/env node' + nodeArgs + '\n';

    // JOROOT to bake into source
    let rootInit = this.genJOROOTInitCode(pkg);

    // Runtime path code
    let rtPathCode;
    if (pkg.ref === 'jo/jo' && this.isDevMode) {
      // For dev builds of jo itself, embed hard-coded path to node_modules
      // based on where this version of jo was built.
      // If we don't do this, then building jo from a different source tree
      // than the calling jo program was built for causes a mismatch of
      // generated code and runtime support.
      let selfJOROOT = path.resolve(__dirname, '..', '..', '..');
      rtPathCode = '"' + selfJOROOT.replace(/"/g, '\\"') + '/node_modules/"+ref';
    } else {
      rtPathCode = '__$r+"/node_modules/"+ref';
    }

    // Code: variables
    let codeVars = `
var __$r=function(){__$r=${rootInit};}
,__$lrt=function(ref){
  if(typeof __$r!=="string"){__$r();}
  return require(${rtPathCode});
}
,__$i=global.__$i=function(m){return m && m.__esModule ? (m["default"] || m) : m; }
,__$iw=global.__$iw=function(m){return m && m.__esModule ? m : {"default":m}; }
    `.trim()+'\n';

    // Code: after variables
    let codeRest = `
global.__$irt=function(r){return __$i(__$lrt(r));};
__$irt("source-map-support").install();
    `.trim()+'\n';

    // Imports Jo packages?
    let hasPkgImports = pkg.pkgInfo.imports && pkg.pkgInfo.imports.some(ref =>
      ref[0] !== '.' && ref[0] !== '/' && !this.builtInModuleRefs[ref] );
    if (hasPkgImports) {
      codeVars += `
,__$p
,__$fex=require("fs").existsSync
,__$lpkg=function(q,ref){
  var i,d,v;
  if(!__$p){
    if(typeof __$r!=="string"){__$r();}
    d=${JSON.stringify('/pkg/'+this.pkgDirName+'/')};
    __$p=[__$r+d];
    if(v=process.env.JOPATH){
      v=v.split(":");
      for(i in v){
        if(v[i])__$p.push(v[i]+d);
      }
    }
  }
  for(i in __$p){
    d=__$p[i]+ref+"/index.js";
    if(__$fex(d)){
      return q(d);
    }
  }
  return q(ref);
}
      `.trim()+'\n';
      codeRest += `
global.__$im=function(q,r){return __$i(__$lpkg(q,r));};
global.__$imw=function(q,r){return __$iw(__$lpkg(q,r));};
      `.trim()+'\n';
    }

    // Combine code
    let code = codeVars.trim() + ';\n' + codeRest.trim();
    code = shebang + (this.isDevMode ? code.trim() :
                                       code.replace(/[ \t]*\r?\n[ \t]*/mg, ''));

    this._programBootCode = {pkg:pkg,v:code};
    return code;
  }


  // pkgModuleFooter(pkg:Pkg, depLevel:int) {
  //   if (pkg.hasMainFunc) {
  //     if (depLevel > 0) {
  //       throw new Error('Attempting to build program "'+pkg.id+'" as module')
  //     }
  //     return 'main(process.argv);';
  //   }
  //   return null;
  // }


  // postCompile(pkg:Pkg, depLevel:int) {
  //   if (!pkg.jopath && depLevel === 0) {
  //     pkg.module.map.inline = true;
  //   }
  // }


  async postMake(pkgs:Pkg[]) {
    var pkg = pkgs[0];

    if (pkg.jopath && !pkg.hasMainFunc) {
      // Not a program
      return;
    }

    var fileMode = 511; // 0777
    if (!pkg.hasMainFunc) {
      fileMode = 438; // 0666
    }

    var programDstFile = this.programDstFile(pkg);
    let writeToStdout = this.options.output && programDstFile === '-';

    // Add main function call
    let code = pkg.module.code;
    let p = code.lastIndexOf('\n//#sourceMappingURL=');
    let mainCall = 'main(process.argv);\n';
    if (p === -1) {
      code += mainCall;
    } else {
      code = code.substr(0, p+1) + mainCall + code.substr(p+1);
    }

    pkg.module.map.inline = true;

    // if (this.options.linkStatically) {
    //   ...
    // }

    await writeCode(code, pkg.module.map, programDstFile, writeToStdout);
    if (!writeToStdout) {
      await fs.chmod(programDstFile, fileMode);
    }
  }

}

function init() {
  Targets[TARGET_NODEJS] = NodeJSTarget;
}
