import fsx from 'fs-extra'
import os from 'os'

var WorkDir = Object.create(null, {
  // createSync()
  createSync: {enumerable:true, value:function() {
    if (!this._created) {
      fsx.mkdirsSync(this.path)
      process.on('exit', () => {
        fsx.removeSync(this.path)
      })
      this._created = true
    }
  }},

  path: { enumerable: true,
    value: os.tmpdir().replace(/\/*$/, '') + '/jo-work-' + Date.now().toString(36)
  },

  // async ensureDir(relname:string):string
  ensureDir: { enumerable: true,
    value: function (relname) { return new Promise((resolve, reject) => {
      var dirname = this.path + '/' + relname
      fsx.mkdirs(dirname, (err) => {
        if (err) reject(err); else resolve(dirname)
      })
    })}
  }

})
