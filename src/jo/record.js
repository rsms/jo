
function _$record(name, prototype) {
  Object.defineProperties(prototype, {
    __name: { value: name },
    toString: { value: function toString() {
      return "<record "+this.__name+" "+JSON.stringify(this)+">";
    } },
  });
  if (__DEV__) { Object.freeze(prototype); }
  var record = function record(properties) {
    var k, v, props = {};
    for (k in properties) {
      v = properties[k];
      if (v !== undefined) {
        props[k] = {value:v, enumerable:true};
      }
      if (__DEV__) {
        if (!(k in prototype)) {
          throw new Error('unexpected property '+JSON.stringify(k)+' assigned to record '+name);
        }
      }
    }
    return Object.create(prototype, props);
  };
  record.default = prototype;
  return record;
}
