// `__DEV__` -> `process.env.JO_BUILD_DEV === "dev"`

var process_env_JO_BUILD_DEV =
  B.memberExpression(
    B.identifier('process'),
    B.memberExpression(
      B.identifier('env'),
      B.identifier('JO_BUILD_MODE'),
      false // computed
    ),
    false // computed
  );

var is__DEV__ = B.binaryExpression('===', process_env_JO_BUILD_DEV, B.literal("dev"));

export var __DEV__Visitor = {

  visitIdentifier: function(path) {
    if (path.node.name === '__DEV__') {
      path.replace(is__DEV__);
    }
    this.traverse(path);
  },

};
