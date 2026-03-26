// Bank CSV Import Presets for Canadian Financial Institutions

export const BANK_PRESETS = {
  TD: {
    name: 'TD Canada Trust',
    detect: (headers) => headers.some(h => /^Account\s*Number$/i.test(h)) && headers.some(h => /^Transaction\s*Date$/i.test(h)),
    mapping: { date: 'Transaction Date', description: 'Description 1', amount: null, debit: 'Debit Amount', credit: 'Credit Amount' },
    dateFormat: 'MM/DD/YYYY',
    extraDescription: 'Description 2',
  },
  RBC: {
    name: 'Royal Bank of Canada',
    detect: (headers) => headers.some(h => /^Account\s*Type$/i.test(h)) && headers.some(h => /^CAD\$$/i.test(h)),
    mapping: { date: 'Transaction Date', description: 'Description 1', amount: 'CAD$' },
    dateFormat: 'MM/DD/YYYY',
    extraDescription: 'Description 2',
  },
  BMO: {
    name: 'Bank of Montreal',
    detect: (headers) => headers.some(h => /^First\s*Bank\s*Card$/i.test(h)) || (headers.some(h => /^Transaction\s*Date$/i.test(h)) && headers.some(h => /^Transaction\s*Amount$/i.test(h)) && headers.length <= 5),
    mapping: { date: 'Transaction Date', description: 'Description', amount: 'Transaction Amount' },
    dateFormat: 'YYYYMMDD',
  },
  BNS: {
    name: 'Scotiabank',
    detect: (headers) => headers.some(h => /^Date$/i.test(h)) && headers.some(h => /^Amount$/i.test(h)) && headers.length <= 4,
    mapping: { date: 'Date', description: 'Description', amount: 'Amount' },
    dateFormat: 'MM/DD/YYYY',
  },
  CIBC: {
    name: 'CIBC',
    detect: (headers) => headers.some(h => /^Transaction\s*Date$/i.test(h)) && headers.some(h => /^Transaction\s*Details$/i.test(h)),
    mapping: { date: 'Transaction Date', description: 'Transaction Details', amount: null, debit: 'Debit', credit: 'Credit' },
    dateFormat: 'YYYY-MM-DD',
  },
  NBC: {
    name: 'National Bank of Canada',
    detect: (headers) => headers.some(h => /^Date\s*de\s*transaction$/i.test(h)) || (headers.some(h => /^Transaction\s*date$/i.test(h)) && headers.some(h => /^Credit$/i.test(h)) && headers.some(h => /^Debit$/i.test(h))),
    mapping: { date: ['Transaction date', 'Date de transaction'], description: ['Description'], amount: null, debit: ['Debit', 'Débit'], credit: ['Credit', 'Crédit'] },
    dateFormat: 'YYYY-MM-DD',
  },
  WEALTHSIMPLE: {
    name: 'Wealthsimple',
    detect: (headers) => headers.some(h => /^Date$/i.test(h)) && headers.some(h => /^Net\s*Amount$/i.test(h)),
    mapping: { date: 'Date', description: 'Description', amount: 'Net Amount' },
    dateFormat: 'YYYY-MM-DD',
  },
  WEALTHSIMPLE_TRADE: {
    name: 'Wealthsimple Trade',
    detect: (headers) => headers.some(h => /^Date$/i.test(h)) && headers.some(h => /^Transaction\s*Type$/i.test(h)) && headers.some(h => /^Symbol$/i.test(h)),
    mapping: { date: 'Date', description: 'Transaction Type', amount: 'Amount' },
    dateFormat: 'YYYY-MM-DD',
    extraFields: { symbol: 'Symbol', quantity: 'Quantity', price: 'Price' },
  },
  QUESTRADE: {
    name: 'Questrade',
    detect: (headers) => headers.some(h => /^Transaction\s*Date$/i.test(h)) && headers.some(h => /^Settlement\s*Date$/i.test(h)) && headers.some(h => /^Action$/i.test(h)) && headers.some(h => /^Net\s*Amount$/i.test(h)),
    mapping: { date: 'Transaction Date', description: 'Description', amount: 'Net Amount' },
    dateFormat: 'YYYY-MM-DD',
    extraDescription: 'Action',
    extraFields: { symbol: 'Symbol', quantity: 'Quantity', price: 'Price', commission: 'Commission', currency: 'Currency', activityType: 'Activity Type', accountType: 'Account Type' },
  },
  QUESTRADE_ACCOUNT: {
    name: 'Questrade Account Activity',
    detect: (headers) => headers.some(h => /^Date$/i.test(h)) && headers.some(h => /^Activity\s*Type$/i.test(h)) && headers.some(h => /^Net\s*Amount$/i.test(h)),
    mapping: { date: 'Date', description: 'Activity Type', amount: 'Net Amount' },
    dateFormat: 'YYYY-MM-DD',
  },
  WEALTHSIMPLE_ACTIVITY: {
    name: 'Wealthsimple Activity',
    detect: (headers) => headers.some(h => /^transaction_date$/i.test(h)) && headers.some(h => /^activity_type$/i.test(h)) && headers.some(h => /^net_cash_amount$/i.test(h)),
    mapping: {
      date: 'transaction_date',
      description: 'activity_type',
      amount: 'net_cash_amount',
    },
    dateFormat: 'YYYY-MM-DD',
    extraDescription: 'activity_sub_type',
    extraFields: {
      symbol: 'symbol',
      name: 'name',
      quantity: 'quantity',
      price: 'unit_price',
      commission: 'commission',
      currency: 'currency',
      accountType: 'account_type',
      direction: 'direction',
    },
  },
  WEALTHSIMPLE_HOLDINGS: {
    name: 'Wealthsimple Holdings',
    detect: (headers) => headers.some(h => /^Account\s*Name$/i.test(h)) && headers.some(h => /^Symbol$/i.test(h)) && headers.some(h => /^Market\s*Price$/i.test(h)) && headers.some(h => /^Quantity$/i.test(h)),
    type: 'holdings', // Not transactions — portfolio snapshot
    mapping: {
      symbol: 'Symbol',
      name: 'Name',
      quantity: 'Quantity',
      price: 'Market Price',
      priceCurrency: 'Market Price Currency',
      bookValue: 'Book Value (CAD)',
      marketValue: 'Market Value',
      marketValueCurrency: 'Market Value Currency',
      accountType: 'Account Type',
      accountName: 'Account Name',
      securityType: 'Security Type',
      unrealizedReturn: 'Market Unrealized Returns',
    },
  },
  CANADA_LIFE: {
    name: 'Canada Life',
    detect: (headers) => headers.some(h => /^Transaction\s*Date$/i.test(h)) && headers.some(h => /^Transaction\s*Type$/i.test(h)) && headers.some(h => /^Fund\s*Name$/i.test(h)),
    mapping: { date: 'Transaction Date', description: 'Transaction Type', amount: 'Amount' },
    dateFormat: 'YYYY-MM-DD',
    extraFields: { fund: 'Fund Name', units: 'Units', unitPrice: 'Unit Price' },
  },
  CANADA_LIFE_ACCOUNT: {
    name: 'Canada Life Account Statement',
    detect: (headers) => headers.some(h => /^Date$/i.test(h)) && headers.some(h => /^Description$/i.test(h)) && headers.some(h => /^Plan\s*Type$/i.test(h)),
    mapping: { date: 'Date', description: 'Description', amount: 'Amount' },
    dateFormat: 'MM/DD/YYYY',
  },
};

/** Detect which bank a CSV came from based on its headers. */
export function detectBank(headers) {
  if (!headers || !Array.isArray(headers)) return null;
  const cleaned = headers.map(h => (h || '').trim());
  for (const [key, preset] of Object.entries(BANK_PRESETS)) {
    if (preset.detect(cleaned)) return key;
  }
  return null;
}

function resolveHeader(fieldMapping, headers) {
  if (!fieldMapping) return null;
  if (Array.isArray(fieldMapping)) {
    for (const candidate of fieldMapping) {
      const found = headers.find(h => h.toLowerCase().trim() === candidate.toLowerCase().trim());
      if (found) return found;
    }
    return null;
  }
  return headers.find(h => h.toLowerCase().trim() === fieldMapping.toLowerCase().trim()) || null;
}

function parseDate(dateStr, format) {
  if (!dateStr) return null;
  const d = dateStr.trim();
  if (format === 'YYYY-MM-DD' && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  if (format === 'YYYYMMDD' && /^\d{8}$/.test(d)) return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
  if (format === 'MM/DD/YYYY' && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(d)) {
    const [m, day, y] = d.split('/');
    return `${y}-${m.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  const parsed = new Date(d);
  if (!isNaN(parsed)) return parsed.toISOString().slice(0, 10);
  return null;
}

/** Apply a bank preset to parse a CSV row into a WealthFlow transaction. */
export function applyBankPreset(row, bankKey, headers) {
  const preset = BANK_PRESETS[bankKey];
  if (!preset) return null;
  const mapping = preset.mapping;

  const dateHeader = resolveHeader(mapping.date, headers);
  const date = dateHeader ? parseDate(row[dateHeader], preset.dateFormat) : null;

  const descHeader = resolveHeader(mapping.description, headers);
  let description = descHeader ? (row[descHeader] || '').trim() : '';
  if (preset.extraDescription) {
    const extraHeader = resolveHeader(preset.extraDescription, headers);
    if (extraHeader && row[extraHeader]) {
      const extra = row[extraHeader].trim();
      if (extra && extra !== description) description += ' - ' + extra;
    }
  }

  let amount = 0;
  if (mapping.amount) {
    const amtHeader = resolveHeader(mapping.amount, headers);
    if (amtHeader) amount = parseFloat((row[amtHeader] || '0').replace(/[,$]/g, '')) || 0;
  } else if (mapping.debit && mapping.credit) {
    const debitHeader = resolveHeader(mapping.debit, headers);
    const creditHeader = resolveHeader(mapping.credit, headers);
    const debit = debitHeader ? parseFloat((row[debitHeader] || '0').replace(/[,$]/g, '')) || 0 : 0;
    const credit = creditHeader ? parseFloat((row[creditHeader] || '0').replace(/[,$]/g, '')) || 0 : 0;
    amount = credit > 0 ? credit : -Math.abs(debit);
  }

  return { date, description, amount };
}

/** Get all available bank presets for display in a dropdown. */
export function listBankPresets() {
  return Object.entries(BANK_PRESETS).map(([key, preset]) => ({ key, name: preset.name }));
}
