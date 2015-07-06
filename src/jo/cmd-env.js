var EnvCmd = {
desc: 'Prints Jo environment information',
main: async function(opts, args, usage) {

  for (let k in Env) {
    if (k === k.toUpperCase()) {
      let v = (typeof Env[k] === 'string') ? Env[k] : Env.format(Env[k])
      process.stdout.write(k + "=" + JSON.stringify(v) + "\n")
    }
  }

}}
