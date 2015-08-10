function plugin(name, visitor) {
  let options = { visitor: visitor };
  if (visitor.pre) {
    options.pre = visitor.pre;
    delete visitor.pre;
  }
  if (visitor.post) {
    options.post = visitor.post;
    delete visitor.post;
  }
  return function({ Plugin, types: t }) {
    return new Plugin(name, options);
  }
}
