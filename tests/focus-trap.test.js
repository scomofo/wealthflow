// Regression coverage for finding M17 (focus traps): before this fix, opening
// a modal never moved keyboard focus into it and Tab/Shift+Tab could escape
// the overlay to elements behind it. focus-trap.js is the shared utility now
// wired into app.js's render() (initial focus) and its document keydown
// handler (Tab trapping) for all three modal kinds.

const { getFocusableElements, focusModalOnOpen, trapTabKey } = require('../src/renderer/js/utils/focus-trap.js');

function makeFocusable() {
  return { focus: jest.fn() };
}

function makeOverlay(focusables) {
  const el = {
    focus: jest.fn(),
    querySelectorAll: jest.fn(() => focusables),
  };
  el.contains = jest.fn((node) => node === el || focusables.includes(node));
  return el;
}

describe('getFocusableElements', () => {
  test('returns the focusable descendants found by querySelectorAll', () => {
    const a = makeFocusable();
    const b = makeFocusable();
    const overlay = makeOverlay([a, b]);
    expect(getFocusableElements(overlay)).toEqual([a, b]);
  });

  test('returns an empty array for a null/undefined container', () => {
    expect(getFocusableElements(null)).toEqual([]);
    expect(getFocusableElements(undefined)).toEqual([]);
  });
});

describe('focusModalOnOpen', () => {
  afterEach(() => {
    delete global.document;
  });

  test('focuses the first focusable element when focus is outside the overlay', () => {
    const first = makeFocusable();
    const second = makeFocusable();
    const overlay = makeOverlay([first, second]);
    global.document = { activeElement: { some: 'unrelated-element' } };

    focusModalOnOpen(overlay);

    expect(first.focus).toHaveBeenCalledTimes(1);
    expect(second.focus).not.toHaveBeenCalled();
  });

  test('does nothing if focus is already inside the overlay (avoids yanking focus on re-render)', () => {
    const first = makeFocusable();
    const overlay = makeOverlay([first]);
    global.document = { activeElement: first };

    focusModalOnOpen(overlay);

    expect(first.focus).not.toHaveBeenCalled();
  });

  test('falls back to focusing the overlay itself when it has no focusable descendants', () => {
    const overlay = makeOverlay([]);
    global.document = { activeElement: { some: 'unrelated-element' } };

    focusModalOnOpen(overlay);

    expect(overlay.focus).toHaveBeenCalledTimes(1);
  });

  test('is a no-op for a null overlay (no modal open)', () => {
    global.document = { activeElement: null };
    expect(() => focusModalOnOpen(null)).not.toThrow();
  });
});

describe('trapTabKey', () => {
  afterEach(() => {
    delete global.document;
  });

  function makeEvent(key, shiftKey = false) {
    return { key, shiftKey };
  }

  test('ignores non-Tab keys', () => {
    const overlay = makeOverlay([makeFocusable()]);
    global.document = { activeElement: null };
    expect(trapTabKey(makeEvent('Escape'), overlay)).toBe(false);
  });

  test('wraps Tab from the last focusable element back to the first', () => {
    const first = makeFocusable();
    const last = makeFocusable();
    const overlay = makeOverlay([first, last]);
    global.document = { activeElement: last };

    const handled = trapTabKey(makeEvent('Tab'), overlay);

    expect(handled).toBe(true);
    expect(first.focus).toHaveBeenCalledTimes(1);
  });

  test('wraps Shift+Tab from the first focusable element back to the last', () => {
    const first = makeFocusable();
    const last = makeFocusable();
    const overlay = makeOverlay([first, last]);
    global.document = { activeElement: first };

    const handled = trapTabKey(makeEvent('Tab', true), overlay);

    expect(handled).toBe(true);
    expect(last.focus).toHaveBeenCalledTimes(1);
  });

  test('does not interfere with Tab between two middle elements', () => {
    const first = makeFocusable();
    const middle = makeFocusable();
    const last = makeFocusable();
    const overlay = makeOverlay([first, middle, last]);
    global.document = { activeElement: middle };

    const handled = trapTabKey(makeEvent('Tab'), overlay);

    expect(handled).toBe(false);
    expect(first.focus).not.toHaveBeenCalled();
    expect(last.focus).not.toHaveBeenCalled();
  });

  test('pulls focus back in if it has somehow escaped the overlay', () => {
    const first = makeFocusable();
    const last = makeFocusable();
    const overlay = makeOverlay([first, last]);
    global.document = { activeElement: { some: 'element-behind-the-modal' } };

    const handled = trapTabKey(makeEvent('Tab'), overlay);

    expect(handled).toBe(true);
    expect(first.focus).toHaveBeenCalledTimes(1);
  });

  test('returns false when the overlay has no focusable elements', () => {
    const overlay = makeOverlay([]);
    global.document = { activeElement: null };
    expect(trapTabKey(makeEvent('Tab'), overlay)).toBe(false);
  });

  test('returns false for a null overlay (no modal open)', () => {
    global.document = { activeElement: null };
    expect(trapTabKey(makeEvent('Tab'), null)).toBe(false);
  });
});
