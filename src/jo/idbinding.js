type IDBinding = {
  id:ASTIdentifier;
  kind:string;
  file:SrcFile;
}

function IDBinding(id, kind, file) {
  // FIXME: is this really true? Can "hoisted" mean anything else than function?
  return { id: id, kind: ((kind === 'hoisted') ? 'function' : kind), file: file };
}
