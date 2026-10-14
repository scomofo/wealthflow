// Enable caption insets only while native controls overlay the renderer.
// Some Electron versions keep visible=true with an empty caption rectangle.
export function initWindowControlsOverlay() {
  const overlay = navigator.windowControlsOverlay;
  const update = () => {
    const area = overlay?.getTitlebarAreaRect();
    document.documentElement.classList.toggle('has-window-controls-overlay', overlay?.visible === true && area?.width > 0 && area?.height > 0);
  };
  update();
  overlay?.addEventListener('geometrychange', update);
  return () => overlay?.removeEventListener('geometrychange', update);
}
