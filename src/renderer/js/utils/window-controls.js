// Enable caption insets only while native controls overlay the renderer.
// Fullscreen and ordinary browser views have no overlay to reserve space for.
export function initWindowControlsOverlay() {
  const overlay = navigator.windowControlsOverlay;
  const update = () => document.documentElement.classList.toggle('has-window-controls-overlay', overlay?.visible === true);
  update();
  overlay?.addEventListener('geometrychange', update);
  return () => overlay?.removeEventListener('geometrychange', update);
}
