import fs from 'asyncfs'
import path from 'path'


function contentsToWrite({code, map, inlineSourceMap=false}) {
  if (!map || map.inline || inlineSourceMap || map.excluded) {
    // Embed or ignore source map
    if (map && !map.excluded) {
      // assert(!(map instanceof SourceMapGenerator));
      let s = '//#sourceMappingURL=data:application/json;charset:utf-8;base64,' +
              new Buffer(JSON.stringify(map), 'utf8').toString('base64');
      if (code.indexOf('\n//#sourceMappingURL=') !== -1) {
        code = code.replace(/\n\/\/#sourceMappingURL=.+\n/m, '\n'+s+'\n');
      } else {
        code += (code[code.length-1] !== '\n' ? '\n' : '') + s + '\n';
      }
    } else {
      // exclude sourcemap
      code = code.replace(/\n\/\/#sourceMappingURL=.+\n/m, '\n');
    }
    map = null;
  }
  return {code:code, map:map};
}


async function writeCode({code, map, filename, filemode=438/*0666*/, stream, inlineMap=false}) {
  if (filename && stream) {
    throw new Error('both filename and stream are defined')
  }
  let c = contentsToWrite({code:code, map:map, inlineSourceMap:!!stream||inlineMap});
  if (stream) {
    stream.write(c.code);
  } else {
    let wopt = { mode: filemode, encoding: 'utf8' };
    await fs.mkdirs(path.dirname(filename));
    if (c.map) {
      await Promise.all([
        fs.writeFile(filename, c.code, wopt),
        fs.writeFile(filename + '.map', JSON.stringify(c.map), {encoding:'utf8'})
          // ^ We don't use wopt because 'mode'
      ]);
    } else {
      await fs.writeFile(filename, c.code, wopt);
    }
    // TODO: Write "atomically" by writing to tempfile, then fs.link(tempfile, putfile) and finally
    //       fs.unlink(tempfile).
  }
}
