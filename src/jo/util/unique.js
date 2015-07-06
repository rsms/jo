function Unique(a) {
  var b = [], c, i = a.length;
  while (i--) {
    c = a[i];
    if (b.indexOf(c) === -1) {
      b.push(c);
    } 
  }
  return b;
}
