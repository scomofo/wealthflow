// Date-only calendar arithmetic for recurring financial events.
// UTC methods keep YYYY-MM-DD values stable across machine timezones; these
// values represent calendar days, not instants in time.
function parseCalendarDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new TypeError('Expected a calendar date in YYYY-MM-DD format');
  }
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new TypeError('Invalid calendar date');
  }
  return date;
}

function formatCalendarDate(date) {
  return [date.getUTCFullYear().toString().padStart(4, '0'),
    (date.getUTCMonth() + 1).toString().padStart(2, '0'),
    date.getUTCDate().toString().padStart(2, '0')].join('-');
}

// Format a real instant as the user's local calendar date. Do not use
// toISOString().slice(0, 10) for due dates: UTC midnight can be yesterday or
// tomorrow relative to the local clock, especially around DST transitions.
function getLocalCalendarDate(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new TypeError('Expected a valid date');
  return [date.getFullYear().toString().padStart(4, '0'),
    (date.getMonth() + 1).toString().padStart(2, '0'),
    date.getDate().toString().padStart(2, '0')].join('-');
}

// Difference in whole calendar days, independent of 23/25-hour DST days.
function calendarDayDifference(fromDate, toDate) {
  const from = parseCalendarDate(fromDate);
  const to = parseCalendarDate(toDate);
  return Math.round((Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate())
    - Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate())) / 86400000);
}

function calculateNextDue(fromDate, frequency, recurrenceDay = null) {
  const date = parseCalendarDate(fromDate);
  const originalDay = date.getUTCDate();
  const requestedDay = Number.isInteger(Number(recurrenceDay)) && Number(recurrenceDay) >= 1 && Number(recurrenceDay) <= 31
    ? Number(recurrenceDay)
    : originalDay;

  switch (frequency) {
    case 'weekly': date.setUTCDate(originalDay + 7); break;
    case 'biweekly': date.setUTCDate(originalDay + 14); break;
    case 'monthly':
    case 'quarterly': {
      const monthsToAdd = frequency === 'monthly' ? 1 : 3;
      date.setUTCDate(1);
      date.setUTCMonth(date.getUTCMonth() + monthsToAdd);
      const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
      date.setUTCDate(Math.min(requestedDay, lastDay));
      break;
    }
    case 'annual': {
      const year = date.getUTCFullYear() + 1;
      const month = date.getUTCMonth();
      const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
      date.setUTCDate(1);
      date.setUTCFullYear(year);
      date.setUTCDate(Math.min(originalDay, lastDay));
      break;
    }
    default: return fromDate;
  }
  return formatCalendarDate(date);
}

module.exports = { calculateNextDue, parseCalendarDate, formatCalendarDate, getLocalCalendarDate, calendarDayDifference };
