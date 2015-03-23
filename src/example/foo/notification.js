import './bar'  // == import foo from ...
// import fo, {Foo, Bar, Baz} from './bar'
// import {A, B as Bob} from 'bar/some'
import {Component as ReactComponent} from 'react'
// import react from 'react'
// import * as FS from 'fs'  // equiv to `import FS from 'fs'`
// import {ReactComponent as RC} from 'react'
// import {Foo, bar} from 'foo'

// <a href="foo" data-date={new Date}/>;
// <b {...props}/>;

export var foo, bar;
// export class lol {};
// export function lol() {}
// export default {a, b}   // == {a:a, b:b}
// export {a, b}  // != {a:a, b:b}

[1,2].map(x => x * 10)

async function statFile() {
}
async function checkFile() {
  await statFile()
}

let MessageCell = React.createClass({
  render: function() {
    return (
      <Stack hori-zontal={true}>
        "lol"
        <b />
      </Stack>
    );
  }
});

class Button extends ReactComponent {
  render() {
    return <input type="button" onclick={alert("hello")} />
  }

  get lol() { return "lol" }
}
