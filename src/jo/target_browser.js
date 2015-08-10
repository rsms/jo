import fs from 'asyncfs'
import path from 'path'

class BrowserTarget extends Target {
  constructor(id, mode, options) {
    super(id, mode, options);
    this.registerGlobals({
      // Objects
      'window':GLOBAL_STD,
      'WSH':GLOBAL_STD,
      'Image':GLOBAL_STD,
      'XMLHttpRequest':GLOBAL_STD,
      'Notification':GLOBAL_STD,
      'Storage':GLOBAL_STD,
      'Option':GLOBAL_STD,
      'FormData':GLOBAL_STD,

      // Jo-specific
      'require':GLOBAL_STD,
      'exports':GLOBAL_STD,

      // Functions
      'alert':GLOBAL_STD,
      'confirm':GLOBAL_STD,
      'console':GLOBAL_STD,
      'Debug':GLOBAL_STD,
      'opera':GLOBAL_STD,
      'prompt':GLOBAL_STD,
      'setInterval':GLOBAL_STD,
      'setTimeout':GLOBAL_STD,
      'clearInterval':GLOBAL_STD,
      'clearTimeout':GLOBAL_STD,

      // Etc
      'document':GLOBAL_STD,
      'event':GLOBAL_STD,
      'frames':GLOBAL_STD,
      'history':GLOBAL_STD,
      'localStorage':GLOBAL_STD,
      'location':GLOBAL_STD,
      'name':GLOBAL_STD,
      'navigator':GLOBAL_STD,
      'parent':GLOBAL_STD,
      'screen':GLOBAL_STD,
      'sessionStorage':GLOBAL_STD,
    });

    this.modules = [];
  }

  transforms(transforms) {
    return super.transforms(transforms).concat([
      'regenerator',
    ])
  }

  get moduleType() {
    return 'common'
  }


  moduleFilename(pkg:Pkg, depLevel:int) {
    // Write modules in root-level package source directory
    var filename;
    if (pkg.ref) {
      filename = pkg.ref.replace(/\//g, '.');
    } else {
      path.basename(pkg.dir);
    }
    filename = '.jopkg.'+filename+'.js';
    this.modules.push({filename: filename, pkg: pkg});
    return this.outputDir + '/' + filename;
  }



  async loadHTMLTemplate(pkg) {
    var filename = pkg.dir + '/index.template.html';
    try {
      return {
        code: await fs.readFile(filename, {encoding:'utf8'}),
        filename: filename,
      }
    } catch (e) {
      return null
    }
  }


  async preMake(pkgs:Pkg[]) {
    if (pkgs.length !== 1) {
      throw new Error('-target=browser only supports a single top-level package');
    }
    this.outputDir = pkgs[0].dir;
  }


  async postMake(pkgs:Pkg[]) {
    var pkg = pkgs[0];
    // Make sure there's a mainFunc
    if (!pkg.hasMainFunc) {
      throw 'No main() function found in package ' + pkg.id;
    }
    
    // Load *.template.html
    var htmlTemplate = await this.loadHTMLTemplate(pkg);
    if (!htmlTemplate) {
      throw new Error('unable to find HTML template index.template.html in "'+pkg.dir+'"');
    }

    // Find insertion point
    var insertOffs = htmlTemplate.code.indexOf('</head>');
    if (insertOffs === -1) {
      if ((insertOffs = htmlTemplate.code.indexOf('<body>')) !== -1) {
        insertOffs += '<body>'.length;
      } else {
        throw new Error("can't find </head> or <body> in HTML template");
      }
    }

    var additionalModuleURLs = [];

    // Find any runtime helpers
    var runtimeModules = this.resolveRequiredRuntimeModules(pkg);
    if (runtimeModules.length !== 0) {
      let runtimeFilename = '.jopkg.babel-runtime.js';
      let version = await this.genRuntime(runtimeModules, pkg.dir + '/' + runtimeFilename);
      additionalModuleURLs.push(runtimeFilename + '?' + version);
    }

    // Generate and insert boot code
    var bootCode = this.genBootCode(pkg, additionalModuleURLs);
    var code =
      '<!--'+JSON.stringify(this.genPkgInfo(pkg))+'-->\n' +
      htmlTemplate.code.substr(0, insertOffs) +
      bootCode +
      htmlTemplate.code.substr(insertOffs);

    // Write template product
    var productFilename = pkg.dir + '/index.html';
    await fs.writeFile(productFilename, code, {encoding:'utf8'});

    // console.log('htmlTemplate:', code);
  }


  genPkgInfo(mainPkg:Pkg) {
    var files = [];
    for (let m of this.modules) {
      if (m.pkg.module instanceof PrecompiledModule) {
        files.push(path.relative(mainPkg.dir, m.pkg.module.filename));
      } else {
        for (let file of m.pkg.module.info.files) {
          files.push(path.relative(mainPkg.dir, m.pkg.dir + '/' + file));
        }
      }
    }
    return {files:files};
  }


  async genRuntime(refs, outFilename) {
    var code = '';
    // core-js must be first if it's part of filenames
    refs = refs.slice();
    refs.sort((a, b) => a === 'core-js' ? -1 : b === 'core-js' ? 1 : 0);
    var filenames = refs.map(ref => this.runtimeHelperSourceFilename(ref));

    // TODO: only rebuild if needed
    // let stats = await Promise.all([outFilename].concat(filenames).map(fn => fs.stat(fn)));
    // stats.forEach((st, i) => {
    // })

    var outs = fs.createWriteStream(outFilename, {encoding:'utf8'});
    var mtimes = await Promise.all(
      filenames.map((srcFilename, i) => this._writeRuntimeModule(refs[i], outs, srcFilename))
    );
    await new Promise((resolve, reject) => {
      outs.end(err => {
        if (err) reject(err); else resolve();
      });
    });

    return mtimes.reduce((m, v) => Math.max(m, v), 0).toString(36)
  }


  async _writeRuntimeModule(ref, outs, srcFilename) {
    var st = await fs.stat(srcFilename);
    var code = await fs.readFile(srcFilename, {encoding:'utf8'});
    outs.write(this._moduleHeader('babel-runtime/' + ref, false));
    outs.write(code);
    outs.write(this._moduleFooter(false));
    return st.mtime.getTime();
  }


  filterPrecompiledModuleCode(pkg:Pkg, code:string) {
    return this.pkgModuleHeader(pkg) + code + this.pkgModuleFooter(pkg);
  }


  pkgModuleHeader(pkg:Pkg, module:Module, depLevel:int) {
    return this._moduleHeader(pkg.ref, module.hasMainFunc);
  }

  pkgModuleFooter(pkg:Pkg, module:Module, depLevel:int) {
    return this._moduleFooter(module.hasMainFunc);
  }

  _moduleHeader(ref:string, isMain:bool) {
    var code;
    if (!ref || isMain) {
      code = '_$jomain';
    } else {
      code = '_$jomodules['+JSON.stringify(ref)+']';
    }
    return code + ' = function(module,exports,require){';
  }

  _moduleFooter(isMain:bool) {
    return isMain ? 'main();};' : '};';
  }


  genBootCode(pkg, additionalModuleURLs) {
    var t = Date.now().toString(36);
    var code = `<script type="text/javascript">
    _$jomodules = {};
    (function(){
      var waitcount = ${this.modules.length + additionalModuleURLs.length};
      var onload = function() {
        var ref, onmessage, joboot;
        if (--waitcount === 0) {
          joboot = function() {
            var modules = {}, require = function(ref) {
              var m = modules[ref];
              if (!m) {
                modules[ref] = m = {exports:{}};
                var f = _$jomodules[ref];
                if (!f) {
                  throw new Error('module not found "'+ref+'"');
                }
                f(m, m.exports, require);
              }
              return m.exports;
            };
            _$jomain({}, {}, require);
            _$jomodules = null;
          };
          if (window.postMessage !== undefined) {
            onmessage = function (ev) {
              if ((ev.source === window || ev.source === null) && ev.data === 'joboot') {
                ev.stopPropagation();
                window.removeEventListener('message', onmessage, true);
                joboot();
              }
            };
            window.addEventListener('message', onmessage, true);
            window.postMessage('joboot', '*');
          } else {
            setTimeout(joboot, 0);
          }
        }
      };
      var h = document.head || document.body || document.documentElement;
      var lm = function(url) {
        var s = document.createElement('script');
        s.defer  = true;
        s.async  = true;
        s.onload = onload;
        s.type   = 'text/javascript';
        s.src    = url;
        h.appendChild(s);
      };`;

    for (let m of this.modules) {
      let version = '';
      if (m.pkg.module.stat) {
        version = '?' + m.pkg.module.stat.mtime.getTime().toString(36);
      } else if (m.pkg.module.info && m.pkg.module.info.version) {
        version = '?' + m.pkg.pkgInfo.version;
      }
      code += '\n      lm('+JSON.stringify(m.filename + version)+');';
    }

    for (let url of additionalModuleURLs) {
      code += '\n      lm('+JSON.stringify(url)+');';
    }

    code += '\n    })();\n</script>';

    return code;
  }

}

function init() {
  Targets['browser'] = BrowserTarget;
}
