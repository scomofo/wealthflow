/** @jest-environment jsdom */
const { renderImportModal } = require('../src/renderer/js/components/import-modal.js');
const { getModalFocusable, focusActiveModal, trapModalTab } = require('../src/renderer/js/utils/dialog-focus.js');

function renderDialog(overrides = {}) {
  document.body.innerHTML = '<button id="outside">Outside</button>' + renderImportModal({
    headers: ['date', 'description', 'amount'], mapping: { date: 'date', description: 'description', amount: 'amount' },
    rows: [{ date: '2026-10-14', description: 'Purchase', amount: '-20' }], fileType: 'csv', ...overrides,
  });
}
function tab(shiftKey = false) { return { key: 'Tab', shiftKey, preventDefault: jest.fn() }; }

test('initial dialog focus stays on a real control and wraps at both boundaries', () => {
  renderDialog();
  focusActiveModal();
  const controls = getModalFocusable();
  expect(document.activeElement).toBe(controls[0]);
  const backwards = tab(true);
  expect(trapModalTab(backwards)).toBe(true);
  expect(backwards.preventDefault).toHaveBeenCalledTimes(1);
  expect(document.activeElement).toBe(controls.at(-1));
  expect(trapModalTab(tab())).toBe(true);
  expect(document.activeElement).toBe(controls[0]);
});

test('Tab remains contained while saving has disabled every form control', () => {
  renderDialog({ processing: true });
  document.getElementById('outside').focus();
  expect(trapModalTab(tab())).toBe(true);
  expect(document.activeElement.classList.contains('import-modal')).toBe(true);
  expect(trapModalTab(tab(true))).toBe(true);
});

test('error details summary remains keyboard reachable during a save', () => {
  renderDialog({ processing: true, rows: [{ date: '2026-02-30', description: 'Purchase', amount: '-20' }] });
  expect(getModalFocusable().map(node => node.tagName)).toEqual(['SUMMARY']);
  focusActiveModal();
  expect(document.activeElement.tagName).toBe('SUMMARY');
  expect(trapModalTab(tab())).toBe(true);
  expect(document.activeElement.tagName).toBe('SUMMARY');
});

test('ordinary dialogs use the same trap and non-Tab keys retain their handler', () => {
  document.body.innerHTML = '<div class="modal-overlay" role="dialog"><div class="modal"><button>Close</button></div></div>';
  focusActiveModal();
  expect(document.activeElement.tagName).toBe('BUTTON');
  expect(trapModalTab({ key: 'Escape' })).toBe(false);
  document.body.innerHTML = '';
  expect(trapModalTab(tab())).toBe(false);
});
