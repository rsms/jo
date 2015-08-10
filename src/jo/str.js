// Counts occurances of needle in haystack
function strCount(haystack:string, needle:string) {
  // assert(needle.length === 1);
  let re = strCount.mem[needle] || ( strCount.mem[needle]
         = new RegExp(needle.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g') );
  return (haystack.match(re)||[]).length;
}
strCount.mem = {};
