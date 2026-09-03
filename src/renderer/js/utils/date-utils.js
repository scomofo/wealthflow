/**
 * Date-only ("YYYY-MM-DD") string handling that stays in local time end to
 * end.
 *
 * `new Date("2026-01-01")` parses as UTC midnight, and `.toISOString()`
 * formats back in UTC. Mixing either of those with *local* getters/setters
 * (getDate(), setMonth(), getFullYear(), ...) silently shifts a date-only
 * value by a day for anyone west of UTC — i.e. everywhere in Canada. These
 * helpers keep date-only values in local time throughout.
 */

export function parseLocalDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatLocalDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayLocalISO() {
  return formatLocalDate(new Date());
}
