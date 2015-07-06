import fs from 'asyncfs'
import os from 'os'

var WorkDir = {
  path: os.tmpdir().replace(/\/*$/, '') + '/jo-work-' + Date.now().toString(36),

  // async ensureDir(relname:string):string
  async ensureDir(relname:string) {
    var dirname = this.path + '/' + relname;
    await fs.mkdirs(dirname)
    return dirname;
  },

  enableRemoveAtExit() {
    process.on('exit', () => {
      try { removeSync(WorkDir.path); } catch (e) {}
    });
  },

}


function removeSync(path) {
  var files = [];
  if (fs.existsSync(path)) {
    files = fs.readdirSync(path);
    files.forEach(function(file,index){
      var curPath = path + "/" + file;
      if (fs.lstatSync(curPath).isDirectory()) { // recurse
        removeSync(curPath);
      } else { // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
}
