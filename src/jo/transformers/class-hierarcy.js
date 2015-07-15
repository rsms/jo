function Classes({ Plugin, types: t }) {
  return new Plugin("jo.classes", { visitor: {

    ClassDeclaration(node, parent, scope, file) {
      var jo:CompileContext = this.state.opts._joctx;

      // Register as class, later to be used to mark "let" identifiers in
      // CompileCtx.registerIDDefinitions
      if (!jo.file._classDeclarationIDs) { jo.file._classDeclarationIDs = {}; }
      jo.file._classDeclarationIDs[node.id.name] = true;

      // Note: FileScope/post registers class declarations in file.definedIDs
      //       as babel.es6.classes has converted classes to "let" vars.

      if (node.superClass) {
        // console.log('class', node.id.name, 'extends', node.superClass.name);
        if (!jo.file.superclassReferences) { jo.file.superclassReferences = {}; }
        jo.file.superclassReferences[node.superClass.name] = node;
      }
    }

  }})
}
