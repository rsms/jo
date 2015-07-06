import fs from './asyncfs'
import path from 'path'

async function writeCode(code, sourcemap, outfile, writeToStdout:bool=false) {
  if (!writeToStdout) {
    await fs.mkdirs(path.dirname(outfile));
  }
  if (!sourcemap || sourcemap.inline || sourcemap.excluded) {
    if (sourcemap && !sourcemap.excluded) {
      let sourceMapReplacement = '';
      sourceMapReplacement = '//#sourceMappingURL=data:application/json;charset:utf-8;base64,' +
                             new Buffer(sourcemap.toString()).toString('base64');
      if (code.indexOf('\n//#sourceMappingURL=') !== -1) {
        code = code.replace(/\n\/\/#sourceMappingURL=.+\n/m, '\n'+sourceMapReplacement+'\n');
      } else {
        code += (code[code.length-1] !== '\n' ? '\n' : '') + sourceMapReplacement + '\n';
      }
    } else {
      code.replace(/\n\/\/#sourceMappingURL=.+\n/m, '\n');
    }

    if (!writeToStdout) {
      await fs.writeFile(outfile, code, {encoding:'utf8'});
    }
  } else if (!writeToStdout) {
    await Promise.all([
      fs.writeFile(outfile, code, {encoding:'utf8'}),
      fs.writeFile(outfile + '.map', JSON.stringify(sourcemap), {encoding:'utf8'})
    ]);
  }
  // TODO: Write "atomically" by writing to tempfile, then fs.link(tempfile, putfile) and finally
  //       fs.unlink(tempfile).
  if (writeToStdout) {
    process.stdout.write(code);
  }
}
