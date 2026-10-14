// One normalization contract for preview, duplicate checks and insertion.
import { CATEGORIES } from '../canadian/constants.js';
import { autoCategorize } from './csv-parser.js';

// Matches the main-process validation boundary's maximum array length.
export const MAX_IMPORT_BATCH = 10000;

const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

function calendarDate(year, month, day) {
  const y = Number(year), m = Number(month), d = Number(day);
  if (y < 1000 || y > 9999 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const check = new Date(Date.UTC(y, m - 1, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function normalizeImportDate(raw, dateFormat = 'MM/DD/YYYY') {
  const value = String(raw ?? '').trim();
  if (!value) return null;
  // Keep the statement's calendar day, including for ISO timestamps. A UTC
  // conversion would move some Canadian transactions into a different day.
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?(?:Z|[+-](?:[01]\d|2[0-3]):?[0-5]\d)?)?$/);
  if (iso) return calendarDate(iso[1], iso[2], iso[3]);
  const ymd = value.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/) || value.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (ymd) return calendarDate(ymd[1], ymd[2], ymd[3]);
  const numeric = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (numeric) return dateFormat === 'DD/MM/YYYY'
    ? calendarDate(numeric[3], numeric[2], numeric[1])
    : calendarDate(numeric[3], numeric[1], numeric[2]);
  const dayMonth = value.match(/^(\d{1,2})[ -]([A-Za-z]{3})[ -](\d{4})$/);
  if (dayMonth) return calendarDate(dayMonth[3], MONTHS[dayMonth[2].toLowerCase()] || 0, dayMonth[1]);
  const monthDay = value.match(/^(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2}),?\s+(\d{4})$/i);
  if (monthDay) return calendarDate(monthDay[3], MONTHS[monthDay[1].toLowerCase().slice(0, 3)] || 0, monthDay[2]);
  return null;
}

export function parseImportAmount(raw) {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) && Number.isSafeInteger(Math.round(raw * 100)) ? raw : null;
  }
  let value = String(raw ?? '').trim();
  if (!value) return null;
  const accounting = /^\(.*\)$/.test(value);
  if (accounting) value = value.slice(1, -1).trim();
  value = value.replace(/^CAD\s+/i, '').replace(/^\$\s*([+-])/, '$1$');
  const match = value.match(/^([+-]?)\s*\$?\s*((?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?|\.\d{1,2})$/);
  if (!match || (accounting && match[1])) return null;
  const amount = Number(match[2].replace(/,/g, '')) * (accounting || match[1] === '-' ? -1 : 1);
  return Number.isFinite(amount) && Number.isSafeInteger(Math.round(amount * 100)) ? amount : null;
}

function resolveAmount(row, mapping) {
  if (mapping.amount) {
    const amount = parseImportAmount(row[mapping.amount]);
    return { amount, error: amount === null ? 'Invalid or missing amount' : null };
  }
  if (!mapping.debit && !mapping.credit) return { amount: null, error: 'Map an amount, debit or credit column' };
  const parseColumn = column => {
    const value = column ? row[column] : null;
    return value === null || value === undefined || String(value).trim() === '' ? 0 : parseImportAmount(value);
  };
  const debit = parseColumn(mapping.debit), credit = parseColumn(mapping.credit);
  if (debit === null || credit === null) return { amount: null, error: 'Invalid debit or credit amount' };
  if (debit !== 0 && credit !== 0) return { amount: null, error: 'Both debit and credit have amounts; check the mapping' };
  return { amount: credit - debit, error: null };
}

export function normalizeImportRow(row, mapping, options = {}) {
  const rawDate = mapping.date ? row[mapping.date] : null;
  const date = normalizeImportDate(rawDate, options.dateFormat);
  const descriptionParts = [mapping.description, mapping.extraDescription]
    .filter(Boolean).map(column => String(row[column] ?? '').trim()).filter(Boolean);
  const description = [...new Set(descriptionParts)].join(' - ');
  const { amount, error: amountError } = resolveAmount(row, mapping);
  let error = !date ? (String(rawDate ?? '').trim() ? 'Invalid date' : 'Missing date')
    : amountError || (amount === 0 ? 'Zero amount' : null);
  // Match the IPC validation limits here so one bad row cannot reject an
  // otherwise valid atomic batch after the preview has promised success.
  if (!error && !description) error = 'Missing description';
  if (!error && description.length > 2000) error = 'Description exceeds 2,000 characters';

  const explicitCategory = mapping.category ? String(row[mapping.category] ?? '').trim() : '';
  const mappedCategory = CATEGORIES.find(category => category.toLowerCase() === explicitCategory.toLowerCase());
  if (!error && explicitCategory && !mappedCategory) error = 'Unknown category; change or skip the category mapping';
  const detected = autoCategorize(description);
  const category = mappedCategory || (detected === 'Transfer' ? 'Transfer'
    : amount > 0 ? (['Income', 'Investment Income', 'Government Benefits'].includes(detected) ? detected : 'Income')
    : CATEGORIES.includes(options.aiCategory) ? options.aiCategory : detected);
  return { date, description, amount, category, error };
}
