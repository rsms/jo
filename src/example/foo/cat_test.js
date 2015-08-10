// import 'testing'
// import 'assert'

function TestFunnyCats(t) {
  t.fail('oh noes');
  t.fail('oh noes again');
  assert("lol" === 'cat');
  t.assertEQ(FunnyCats, 4);
}

async function TestAsync(t) {
  await Promise.all([
    new Promise(resolve => setTimeout(resolve,1000))
  ]);
}
