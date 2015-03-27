import {inspect} from 'util'

export function repr(obj, depth=4) {
  return inspect(obj, {depth:depth, colors:true});
}
