import {types as t} from 'babel'

export var ClassHierarchyTransformer = {

  ClassDeclaration(node, parent, scope, file) {
    // console.log('class', repr(node,2));
    if (!file.jofile.classDeclaration) { file.jofile.classDeclaration = {}; }
    file.jofile.classDeclaration[node.id.name] = node.superClass || null;

    if (node.superClass) {
      if (!file.jofile.superclassReferences) { file.jofile.superclassReferences = {}; }
      file.jofile.superclassReferences[node.superClass.name] = node;
    }
  }

}
