import { CATEGORIES, CATEGORY_COLORS } from './canadian/constants.js';

export const fmt = n => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(n);
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const h = str => String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

export const CATS = CATEGORIES;
export const CC = CATEGORY_COLORS;

export function validateRequired(value, fieldName) {
  if (!value || (typeof value === 'string' && !value.trim())) {
    return `${fieldName} is required`;
  }
  return null;
}

export function validateAmount(value, fieldName = 'Amount') {
  if (value === '' || value === null || value === undefined) return `${fieldName} is required`;
  const num = Number(value);
  if (isNaN(num)) return `${fieldName} must be a number`;
  if (num < 0) return `${fieldName} cannot be negative`;
  return null;
}

export function validateDate(value, fieldName = 'Date') {
  if (!value) return null; // optional dates are OK
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${fieldName} must be YYYY-MM-DD format`;
  const d = new Date(value);
  if (isNaN(d.getTime())) return `${fieldName} is not a valid date`;
  return null;
}

export function showFieldError(inputId, message) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (message) {
    input.classList.add('input-error');
    let errEl = input.nextElementSibling;
    if (!errEl || !errEl.classList.contains('field-error')) {
      errEl = document.createElement('div');
      errEl.className = 'field-error visible';
      input.parentNode.insertBefore(errEl, input.nextSibling);
    }
    errEl.textContent = message;
    errEl.classList.add('visible');
  } else {
    input.classList.remove('input-error');
    const errEl = input.nextElementSibling;
    if (errEl && errEl.classList.contains('field-error')) {
      errEl.classList.remove('visible');
    }
  }
}

export function clearFieldErrors() {
  document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
  document.querySelectorAll('.field-error').forEach(el => el.classList.remove('visible'));
}
