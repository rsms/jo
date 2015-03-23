import {inspect} from 'util'

export function repr(obj, depth) {
  return inspect(obj, {depth:depth||10, colors:true});
}
