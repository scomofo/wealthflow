// Toast notification component
let toasts = [];
let onChange = null;
let actionCallbacks = {};

export function setOnToastChange(fn) { onChange = fn; }

export function showToast(message, type = 'success') {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  toasts.push({ id, message, type });
  if (onChange) onChange();
  setTimeout(() => {
    toasts = toasts.filter(t => t.id !== id);
    delete actionCallbacks[id];
    if (onChange) onChange();
  }, 3000);
}

export function showActionToast(message, actionLabel, callback, type = 'info') {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  toasts.push({ id, message, type, actionLabel, actionId: id });
  actionCallbacks[id] = callback;
  if (onChange) onChange();
  setTimeout(() => {
    toasts = toasts.filter(t => t.id !== id);
    delete actionCallbacks[id];
    if (onChange) onChange();
  }, 8000);
}

export function handleToastAction(actionId) {
  const cb = actionCallbacks[actionId];
  if (cb) {
    cb();
    delete actionCallbacks[actionId];
    toasts = toasts.filter(t => t.actionId !== actionId);
    if (onChange) onChange();
  }
}

export function renderToasts() {
  if (toasts.length === 0) return '';
  const colors = { success: '#10b981', error: '#ef4444', info: '#3b82f6' };
  return `<div class="toast-container">
    ${toasts.map(t => `
      <div class="toast toast-${t.type}" style="border-left:3px solid ${colors[t.type] || colors.info}">
        <span>${t.message}</span>
        ${t.actionLabel ? `<button class="toast-action-btn" data-action="toast-action" data-toast-id="${t.actionId}">${t.actionLabel}</button>` : ''}
      </div>
    `).join('')}
  </div>`;
}
