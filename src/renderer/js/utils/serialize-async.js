/**
 * Wraps an async function so overlapping calls never run concurrently.
 *
 * If a call arrives while the wrapped function is still running, it doesn't
 * start a second, overlapping execution — it just marks that another run is
 * needed once the current one finishes, and returns the in-flight
 * execution's promise. Any number of calls that arrive while one is running
 * collapse into exactly one trailing re-run, not one run apiece.
 *
 * Built for render() in app.js: it's async (awaits State.computeFinancials()
 * on every call, plus more on some sections) but is called from many places
 * without `await` (event handlers, keyboard shortcuts, setOnNavigate's
 * synchronous callback...). Without this, two overlapping calls could
 * interleave their destroyCharts()/initCharts() pairs, and Chart.js rejects
 * creating a second Chart instance on a canvas that still has one attached.
 */
export function createSerializedRunner(fn) {
  let inFlight = null;
  let queued = false;

  function run(...args) {
    if (inFlight) {
      queued = true;
      return inFlight;
    }
    inFlight = fn(...args).finally(() => {
      inFlight = null;
      if (queued) {
        queued = false;
        run(...args);
      }
    });
    return inFlight;
  }

  return run;
}
