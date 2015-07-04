import {inspect} from 'util'

export function repr(obj, depth=4, colors=true) {
  return inspect(obj, {depth:depth, colors:colors});
}
