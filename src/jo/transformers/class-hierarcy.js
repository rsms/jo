var ClassHierarchyTransformer = {

  ClassDeclaration(node, parent, scope, file) {
    if (!file.jofile.classDeclaration) { file.jofile.classDeclaration = {}; }
    file.jofile.classDeclaration[node.id.name] = node.superClass || null;

    if (node.superClass) {
      // console.log('class', node.id.name, 'extends', node.superClass.name);
      if (!file.jofile.superclassReferences) { file.jofile.superclassReferences = {}; }
      file.jofile.superclassReferences[node.superClass.name] = node;
    }
  }

}
