//type Duration = Number;

class Duration {

  // Takes a string expressing a time duration with unit suffix:
  //   "ms" for milliseconds
  //   "s" for seconds
  // Examples:
  //   ParseDuration("120ms") -> 120
  //   ParseDuration("0.12s") -> 120
  static parse(s:string) { //:Duration
    let d = parseFloat(s);
    if (s.substr(-2) !== 'ms') {
      if (s.substr(-1) !== 's') {
        throw new Error('missing unit in duration '+s);
      }
      d *= 1000;
    }
    if (isNaN(d)) {
      throw new Error('invalid duration (not a number)');
    }
    if (d <= 0) {
      throw new Error('invalid duration (zero or negative)');
    }
    return d;
  }

  static format(d:Duration) {
    if (d < 1000) {
      return d.toFixed(0) + 'ms';
    }
    return (d/1000).toFixed(3) + 's';
  }

}
