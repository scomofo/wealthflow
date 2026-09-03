// Focus-trap utilities shared by every modal (renderModal, renderImportModal,
// renderRecurringModal all wrap their markup in a single ".modal-overlay").
// Keeps keyboard/screen-reader focus from leaking to the page behind an open
// modal: focus moves into the modal when it opens, and Tab/Shift+Tab cycles
// only through the modal's own focusable elements.

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/** Focusable descendants of container, in DOM order. */
export function getFocusableElements(container) {
  if (!container) return [];
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR));
}

/**
 * Move focus into the modal overlay when it first opens. No-ops if focus is
 * already somewhere inside the overlay (so re-renders triggered while the
 * user is interacting with the modal — e.g. toggling a checkbox — don't
 * yank focus back to the top every time).
 */
export function focusModalOnOpen(overlay) {
  if (!overlay || overlay.contains(document.activeElement)) return;
  const [first] = getFocusableElements(overlay);
  if (first) {
    first.focus();
  } else if (typeof overlay.focus === 'function') {
    overlay.focus();
  }
}

/**
 * Handle a Tab keydown while a modal is open: wraps focus from the last
 * focusable element back to the first (and Shift+Tab from the first back to
 * the last), so Tab can never escape the overlay to elements behind it.
 * Returns true if it handled (and the caller should preventDefault()).
 */
export function trapTabKey(event, overlay) {
  if (!overlay || event.key !== 'Tab') return false;
  const focusable = getFocusableElements(overlay);
  if (focusable.length === 0) return false;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;

  if (event.shiftKey) {
    if (active === first || !overlay.contains(active)) {
      last.focus();
      return true;
    }
  } else {
    if (active === last || !overlay.contains(active)) {
      first.focus();
      return true;
    }
  }
  return false;
}
