// Strips interfaces (as babel doesn't support it)

export var TypesVisitor = {
  // visitTYPE(path:NodePath)

  visitInterfaceDeclaration: function(path) {
    path.replace(null);
    return false;
  },

  visitDeclareModule: function(path) {
    path.replace(null);
    return false;
  }


};
