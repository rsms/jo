// Position describes an arbitrary source position
// including the file, line, and column location.
// A Position is valid if the line number is > 0.
type Position = {
  filename: string; // filename, if any
  offset:   int;    // offset, starting at 0
  line:     int;    // line number, starting at 1
  column:   int;    // column number, starting at 1 (character count)
}

// Pos is a compact encoding of a source position within a file set.
// It can be converted into a Position for a more convenient, but much
// larger, representation.
//
// The Pos value for a given file is a number in the range [base, base+size],
// where base and size are specified when adding the file to the file set via
// AddFile.
//
// To create the Pos value for a specific source offset, first add
// the respective file to the current file set (via FileSet.addFile)
// and then call File.Pos(offset) for that file. Given a Pos value p
// for a specific file set fset, the corresponding Position value is
// obtained by calling fset.position(p).
//
// Pos values can be compared directly with the usual comparison operators:
// If two Pos values p and q are in the same file, comparing p and q is
// equivalent to comparing the respective source file offsets. If p and q
// are in different files, p < q is true if the file implied by p was added
// to the respective file set before the file implied by q.
//
type Pos = int;

// -----------------------------------------------------------------

// A File is a handle for a file belonging to a FileSet.
// A File has a name, size, and line offset table.
class File {
  set:  FileSet;
  name: string; // file name as provided to addFile
  base: int;    // Pos value range for this file is [base...base+size]
  size: int;    // file size as provided to addFile
  lines: int[];
  infos: lineInfo[];

  // Number of lines in file
  get lineCount() {
    return this.lines.length
  }

  // addLine adds the line offset for a new line.
  // The line offset must be larger than the offset for the previous line
  // and smaller than the file size; otherwise the line offset is ignored.
  addLine(offset:int) {
    let f = this;
    let i = f.lines.length
    if ((i === 0 || f.lines[i-1] < offset) && offset < f.size) {
      f.lines.push(offset)
    }
  }
}


// -----------------------------------------------------------------

// A FileSet represents a set of source files
class FileSet {
  base:  int = 0;      // base offset for the next file
  files: File[] = [];  // list of files in the order added to the set
  last:  File = null;  // cache of last file looked up


  // addFile adds a new file with a given filename, base offset, and file size
  // to the file set s and returns the file. Multiple files may have the same
  // name. The base offset must not be smaller than the FileSet's Base(), and
  // size must not be negative.
  //
  // Adding the file will set the file set's Base() value to base + size + 1
  // as the minimum base value for the next file. The following relationship
  // exists between a Pos value p for a given file offset offs:
  //
  //  int(p) = base + offs
  //
  // with offs in the range [0, size] and thus p in the range [base, base+size].
  // For convenience, File.Pos may be used to create file-specific position
  // values from a file offset.
  //
  addFile(filename:string, base:int, size:int) { //:File
    let s = this;
    if (base < s.base || size < 0) {
      panic("illegal base or size")
    }
    // base >= s.base && size >= 0
    let f = {
      __proto__:File.prototype,
      set: s,
      name: filename,
      base: base,
      size: size,
      lines: [0],
      infos: null,
    }
    base += size + 1 // +1 because EOF also has a position
    if (base < 0) {
      panic("token.Pos offset overflow (> 2G of source code in file set)")
    }
    // add the file to the file set
    s.base = base
    s.files.push(f)
    s.last = f
    return f
  }

}


