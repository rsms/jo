var browserDOMTags; // defined at end-of file

var ReactCreateElementExpr = B.memberExpression(
  B.identifier('React'),
  B.identifier('createElement'),
  false
);

var React__spreadExpr = B.memberExpression(
  B.identifier('React'),
  B.identifier('__spread'),
  false
);


var conservativeJSSymbolRe = /^[A-Z_a-z][0-9A-Z_a-z]*$/;


export var JSXDesugarVisitor = {
  // visitTYPE(path:NodePath)
  
  visitJSXElement: function(path) {
    var node = path.node;
    var open  = node.openingElement;

    //console.log('visitJSXElement', inspect(node, {depth:6}));

    var callArgs;
    if (open.name.name in browserDOMTags) {
      // React.createElement("name", ...)
      callArgs = [B.literal(open.name.name)];
    } else {
      // React.createElement(name, ...)
      callArgs = [B.identifier(open.name.name)];
    }

    // attributes
    var attrs, props, spread;
    if (open.attributes.length !== 0) {
      props = [];

      open.attributes.forEach(function(attr) {
        if (attr.type === 'JSXSpreadAttribute') {
          if (!spread) {
            spread = [];
          }
          // Note: Even though props might be empty (if spread is the first thing in the list),
          // we want an object literal here and not a id to something else, since React.__spread
          // is an alias for Object.assign which mutates the fist arguments.
          // See https://people.mozilla.org/~jorendorff/es6-draft.html#sec-object.assign
          spread.push(B.objectExpression(props));
          spread.push(attr.argument);
          props = [];
        } else {
          //B.JSXAttribute.assert(attr);
          var key = attr.name.name;
          // unless key is a valid JS identifier wrap it as a string literal
          key = conservativeJSSymbolRe.exec(key) ? B.identifier(key) : B.literal(key);
          props.push(B.property('init', key, attr.value));
        }
      });

      if (spread) {
        if (props.length !== 0) {
          spread.push(B.objectExpression(props));
        }
        attrs = B.callExpression(React__spreadExpr, spread);
      } else {
        attrs = B.objectExpression(props);
      }

    } else {
      attrs = B.identifier('null');
    }
    callArgs.push(attrs);

    // has children?
    if (!open.selfClosing) {
      var children = node.children.filter(function (child) {
        if (child.type === 'Literal') {
          // Trim literals and filter out those which are only whitespace
          child.value = child.value.trim();
          if (child.value.length === 0) {
            return false;
          }
          child = B.literal(child.value);
        }
        return true;
      });
      if (children.length === 1) {
        callArgs.push(children[0]);
      } else if (children.length > 1) {
        callArgs = callArgs.concat(children);
      }
    }

    path.replace(B.callExpression(ReactCreateElementExpr, callArgs));

    this.traverse(path);
  },

  visitJSXExpressionContainer: function(n) {
    n.value = n.value.expression;
    return this.traverse(n);
  },

};

// Copied from <react>/src/browser/ReactDOM.js
browserDOMTags = {
  a: true,
  abbr: true,
  address: true,
  area: true,
  article: true,
  aside: true,
  audio: true,
  b: true,
  base: true,
  bdi: true,
  bdo: true,
  big: true,
  blockquote: true,
  body: true,
  br: true,
  button: true,
  canvas: true,
  caption: true,
  cite: true,
  code: true,
  col: true,
  colgroup: true,
  data: true,
  datalist: true,
  dd: true,
  del: true,
  details: true,
  dfn: true,
  dialog: true,
  div: true,
  dl: true,
  dt: true,
  em: true,
  embed: true,
  fieldset: true,
  figcaption: true,
  figure: true,
  footer: true,
  form: true,
  h1: true,
  h2: true,
  h3: true,
  h4: true,
  h5: true,
  h6: true,
  head: true,
  header: true,
  hr: true,
  html: true,
  i: true,
  iframe: true,
  img: true,
  input: true,
  ins: true,
  kbd: true,
  keygen: true,
  label: true,
  legend: true,
  li: true,
  link: true,
  main: true,
  map: true,
  mark: true,
  menu: true,
  menuitem: true,
  meta: true,
  meter: true,
  nav: true,
  noscript: true,
  object: true,
  ol: true,
  optgroup: true,
  option: true,
  output: true,
  p: true,
  param: true,
  picture: true,
  pre: true,
  progress: true,
  q: true,
  rp: true,
  rt: true,
  ruby: true,
  s: true,
  samp: true,
  script: true,
  section: true,
  select: true,
  small: true,
  source: true,
  span: true,
  strong: true,
  style: true,
  sub: true,
  summary: true,
  sup: true,
  table: true,
  tbody: true,
  td: true,
  textarea: true,
  tfoot: true,
  th: true,
  thead: true,
  time: true,
  title: true,
  tr: true,
  track: true,
  u: true,
  ul: true,
  'var': true,
  video: true,
  wbr: true,

  // SVG
  circle: true,
  defs: true,
  ellipse: true,
  g: true,
  line: true,
  linearGradient: true,
  mask: true,
  path: true,
  pattern: true,
  polygon: true,
  polyline: true,
  radialGradient: true,
  rect: true,
  stop: true,
  svg: true,
  text: true,
  tspan: true,
};
