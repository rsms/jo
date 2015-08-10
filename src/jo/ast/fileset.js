// A FileSet represents a set of source files
class FileSet {
  _files:Set<> = new Set;

  // constructor() {
  //   this._files = new Set;
  // }

  addFile(filename:string) {
    this._files.add(filename);
  }

  // Collection interface
  get size() { return this._files.size; }
  [Symbol.iterator]() { return this._files[Symbol.iterator](); }
}
