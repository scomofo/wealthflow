/** @jest-environment jsdom */
const { initWindowControlsOverlay } = require('../src/renderer/js/utils/window-controls.js');

afterEach(() => {
  delete navigator.windowControlsOverlay;
  document.documentElement.className = '';
});

test('ordinary browser views reserve no native caption inset', () => {
  document.documentElement.classList.add('has-window-controls-overlay');
  const cleanup = initWindowControlsOverlay();
  expect(document.documentElement.classList.contains('has-window-controls-overlay')).toBe(false);
  expect(() => cleanup()).not.toThrow();
});

test('native geometry changes remove the inset in fullscreen and restore it afterward', () => {
  const overlay = new EventTarget();
  overlay.visible = true;
  Object.defineProperty(navigator, 'windowControlsOverlay', { configurable: true, value: overlay });
  const cleanup = initWindowControlsOverlay();
  expect(document.documentElement.classList.contains('has-window-controls-overlay')).toBe(true);
  overlay.visible = false;
  overlay.dispatchEvent(new Event('geometrychange'));
  expect(document.documentElement.classList.contains('has-window-controls-overlay')).toBe(false);
  overlay.visible = true;
  overlay.dispatchEvent(new Event('geometrychange'));
  expect(document.documentElement.classList.contains('has-window-controls-overlay')).toBe(true);
  cleanup();
  overlay.visible = false;
  overlay.dispatchEvent(new Event('geometrychange'));
  expect(document.documentElement.classList.contains('has-window-controls-overlay')).toBe(true);
});
