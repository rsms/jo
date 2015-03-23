// Makes sure there are no return statements at the package level.

export var ReturnVisitor = {
  // visitTYPE(path:NodePath)

  visitReturnStatement: function(path) {
    if (path.parent.name === 'program') {
      throw SrcError(
        'LogicError',
        SrcLocation(path.node, this.file),
        'return statement at package level'
      );
    }
    this.traverse(path);
  },


};
