// Directed Acyclic Graph
class DAG {
  constructor() {
    this.nodes = new Map;
  }


  add(fr:any, to?:any) {
    // from -> to
    let v = this.nodes.get(fr);
    if (v) {
      if (to) {
        v.add(to);
      }
    } else {
      this.nodes.set(fr, to ? (new Set).add(to) : null);
    }
    return this;
  }


  sort(cyclicCallback?:Function) {
    // L ← Empty list that will contain the sorted nodes
    // while there are unmarked nodes do
    //     select an unmarked node n
    //     visit(n) 
    // function visit(node n)
    //     if n has a temporary mark then stop (not a DAG)
    //     if n is not marked (i.e. has not been visited yet) then
    //         mark n temporarily
    //         for each node m with an edge from n to m do
    //             visit(m)
    //         mark n permanently
    //         unmark n temporarily
    //         add n to head of L
    var L = [];
    var mark = new Map;
    var visit = (n, edges, pn) => {
      let m = mark.get(n);
      if (m) {
        if (m === true) {
          return; // has been visited
        } else {
          if (cyclicCallback) {
            cyclicCallback(n, pn);
          } else {
            throw 'cyclic graph';
          }
        }
      }
      mark.set(n, 1);
      if (edges) {
        edges.forEach(n2 => { visit(n2, this.nodes.get(n2), n) });
      }
      mark.set(n, true);
      L.push(n);
    };

    for (let e of this.nodes) {
      visit.apply(this, e);
    }
    return L;
  }


  toDotString() {
    let s = 'digraph D {\n';
    let ids = new Map;
    let i = 0;
    let visit = (n, nv) => {
      if (ids.has(n)) return;
      let id = 'N'+(i++);
      s += '  '+id+' [ label="' + String(n) + '" ]\n';
      ids.set(n, id);
    };
    for (let e of this.nodes) {
      visit(e[0]);
      e[1] && e[1].forEach(visit);
    }
    for (let e of this.nodes) {
      let h = '  ' + ids.get(e[0]);
      if (e[1]) {
        h += ' -> ';
        e[1].forEach(n2 => {
          s += h + ids.get(n2) + '\n';
        });
      } else {
        s += h + '\n';
      }
    }
    s += '}\n';
    return s;
  }
}
