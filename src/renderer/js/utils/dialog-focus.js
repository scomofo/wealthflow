function activeModal() {
  return document.querySelector('.modal-overlay[role="dialog"] .modal, .modal-overlay[role="dialog"] .import-modal');
}

export function getModalFocusable() {
  const modal = activeModal();
  if (!modal) return [];
  return [...modal.querySelectorAll('input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), summary, [href], [tabindex]:not([tabindex="-1"])')];
}

export function focusActiveModal() {
  const modal = activeModal();
  if (!modal || modal.contains(document.activeElement)) return;
  const first = getModalFocusable()[0];
  if (first) first.focus();
  else { modal.setAttribute('tabindex', '-1'); modal.focus(); }
}

export function trapModalTab(event) {
  if (event.key !== 'Tab') return false;
  const modal = activeModal();
  if (!modal) return false;
  const focusable = getModalFocusable();
  const first = focusable[0], last = focusable[focusable.length - 1];
  if (!first) {
    event.preventDefault();
    modal.setAttribute('tabindex', '-1');
    modal.focus();
    return true;
  }
  const focused = document.activeElement;
  if (!modal.contains(focused) || focused === modal ||
      (event.shiftKey && focused === first) || (!event.shiftKey && focused === last)) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
    return true;
  }
  return false;
}
