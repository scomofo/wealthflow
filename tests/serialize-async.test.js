// Regression coverage for finding M15: app.js's render() is async (it
// awaits State.computeFinancials() on every call, plus more on some
// sections), but is called from many places without `await`. Two
// overlapping calls could interleave their destroyCharts()/initCharts()
// pairs — Chart.js rejects creating a second Chart instance on a canvas
// that still has one attached from an unfinished earlier call.
const { createSerializedRunner } = require('../src/renderer/js/utils/serialize-async.js');

function deferred() {
  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  return { promise, resolve };
}

describe('createSerializedRunner', () => {
  test('a call made while one is already in flight does not start a second, overlapping execution', async () => {
    const calls = [];
    const first = deferred();
    let callCount = 0;
    const fn = jest.fn(() => {
      callCount++;
      calls.push(`start-${callCount}`);
      return (callCount === 1 ? first.promise : Promise.resolve()).then(() => {
        calls.push(`end-${callCount}`);
      });
    });
    const run = createSerializedRunner(fn);

    const p1 = run(); // starts immediately
    const p2 = run(); // arrives while p1 is still in flight

    expect(fn).toHaveBeenCalledTimes(1); // the second call must not start yet
    expect(calls).toEqual(['start-1']); // no interleaving: end-1 has not happened

    first.resolve();
    await p1;
    await p2;

    // The queued call runs only after the first one fully finished —
    // start-2 never appears between start-1 and end-1.
    expect(calls).toEqual(['start-1', 'end-1', 'start-2', 'end-2']);
  });

  test('several calls that arrive while one is in flight collapse into exactly one trailing run, not one apiece', async () => {
    const first = deferred();
    let callCount = 0;
    const fn = jest.fn(() => {
      callCount++;
      return callCount === 1 ? first.promise : Promise.resolve();
    });
    const run = createSerializedRunner(fn);

    run();
    run();
    run();
    run();

    expect(fn).toHaveBeenCalledTimes(1);
    first.resolve();
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));

    // Four rapid calls => at most 2 actual executions (the in-flight one +
    // one coalesced trailing run), never 4.
    expect(fn).toHaveBeenCalledTimes(2);
  });

  test('a call made after the previous one has fully finished starts immediately, not queued', async () => {
    const fn = jest.fn(() => Promise.resolve());
    const run = createSerializedRunner(fn);

    await run();
    await run();

    expect(fn).toHaveBeenCalledTimes(2);
  });

  test('both callers waiting on an in-flight run resolve only after it (and any queued re-run) complete', async () => {
    const order = [];
    const fn = jest.fn(async () => { order.push('ran'); });
    const run = createSerializedRunner(fn);

    const p1 = run();
    const p2 = run(); // queued
    await Promise.all([p1, p2]);

    order.push('awaited');
    expect(order).toEqual(['ran', 'ran', 'awaited']);
  });
});

describe('app.js wires render() through createSerializedRunner', () => {
  test('render is defined via createSerializedRunner(doRender), not a bare async function', () => {
    const fs = require('fs');
    const path = require('path');
    const appJs = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'js', 'app.js'), 'utf8');

    expect(appJs).toMatch(/import\s*\{\s*createSerializedRunner\s*\}\s*from\s*['"]\.\/utils\/serialize-async\.js['"]/);
    expect(appJs).toMatch(/const render = createSerializedRunner\(doRender\)/);
  });
});
