// Regression coverage for the router fallback bug described in the app
// review (finding L9): navigate() accepted any string as-is. app.js's page
// render dispatch is an if/else chain over exact section names with no
// trailing else, so an unrecognized section left the previously rendered
// page in place (stale/blank) while getCurrentLabel() still fell back to
// "Dashboard" — the header/sidebar label and the actual page content could
// disagree.
const { navigate, getSection, getCurrentLabel, ALL_ROUTES } = require('../src/renderer/js/router.js');

describe('router — unknown-route fallback', () => {
  test('navigating to a known section works normally', () => {
    navigate('budget');
    expect(getSection()).toBe('budget');
    expect(getCurrentLabel()).toBe('Budget');
  });

  test('navigating to an unrecognized section falls back to dashboard, not the raw value', () => {
    navigate('totally-not-a-real-route');
    expect(getSection()).toBe('dashboard');
  });

  test('the fallback keeps getSection() and getCurrentLabel() in agreement', () => {
    navigate('another-bogus-route');
    // Before the fix, getSection() would return the bogus string (so
    // app.js's render dispatch renders nothing new) while getCurrentLabel()
    // independently defaulted to 'Dashboard' — a visible mismatch between
    // the sidebar/header label and the actual page content.
    expect(getSection()).toBe('dashboard');
    expect(getCurrentLabel()).toBe('Dashboard');
  });

  test('every declared route is actually navigable', () => {
    for (const [id, label] of ALL_ROUTES) {
      navigate(id);
      expect(getSection()).toBe(id);
      expect(getCurrentLabel()).toBe(label);
    }
  });
});
