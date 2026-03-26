// CSV Parser utility for WealthFlow

// Common bank CSV header mappings
const DATE_HEADERS = ['date', 'transaction date', 'posted date', 'posting date', 'trans date', 'value date'];
const DESC_HEADERS = ['description', 'memo', 'narrative', 'details', 'transaction', 'payee', 'name'];
const AMOUNT_HEADERS = ['amount', 'value', 'total', 'sum'];
const DEBIT_HEADERS = ['debit', 'withdrawal', 'withdrawals'];
const CREDIT_HEADERS = ['credit', 'deposit', 'deposits'];

// Canadian merchant keywords for auto-categorization
const MERCHANT_CATEGORIES = {
  'Food/Groceries': ['loblaws', 'no frills', 'metro', 'sobeys', 'walmart', 'costco', 'real canadian', 'real cdn super', 'freshco', 'food basics', 'farm boy', 'longos', 'tim horton', 'starbucks', 'mcdonald', 'subway', 'a&w', 'a   w', 'wendy', 'popeyes', 'pizza', 'swiss chalet', 'harvey', 'mary brown', 'skip the dish', 'doordash', 'uber eats', 'instacart', 'save on foods', 'giant tiger', 'dollar tree', 'pasta kulture', 'dream donair', 'stop spot', 'vivo liquor', 'punjab liquor', 'harleys liquor', 'the liquor cabi', 'bellerose liquo', 'bon liquor', '7-eleven'],
  'Transport': ['petro-canada', 'petro canada', 'shell', 'esso', 'killam esso', 'canadian tire gas', 'pioneer', 'ultramar', 'presto', 'ttc', 'go transit', 'uber', 'lyft', 'parking', 'via rail', 'air canada', 'westjet', 'wild rose co-op', 'mobil@', 'camrose cabs', 'white cabs'],
  'Utilities': ['hydro one', 'toronto hydro', 'enbridge', 'alectra', 'bell', 'rogers', 'telus', 'fido', 'koodo', 'freedom mobile', 'virgin plus', 'cogeco', 'shaw', 'videotron'],
  'Entertainment': ['netflix', 'spotify', 'crave', 'disney', 'amazon prime', 'apple', 'youtube', 'cineplex', 'steam', 'playstation', 'xbox', 'nintendo'],
  'Shopping': ['amazon', 'canadian tire', 'home depot', 'rona', 'ikea', 'winners', 'homesense', 'indigo', 'best buy', 'staples', 'dollarama', 'shoppers drug'],
  'Housing': ['rent', 'mortgage', 'td mortgage', 'property tax', 'condo fee'],
  'Insurance': ['intact', 'aviva', 'desjardins insurance', 'sun life', 'manulife', 'great-west', 'canada life', 'co-operators', 'sgi canada', 'sonnet ins'],
  'Healthcare': ['pharmacy', 'dental', 'optician', 'physio', 'chiro', 'doctor', 'clinic', 'hospital'],
};

// Check if a value looks like a date (MM/DD/YYYY, YYYY-MM-DD, etc.)
function looksLikeDate(val) {
  if (!val) return false;
  const s = String(val).trim();
  return /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(s) ||
         /^\d{4}-\d{2}-\d{2}$/.test(s) ||
         /^\d{1,2}-\d{1,2}-\d{4}$/.test(s) ||
         /^\d{1,2}-[A-Za-z]{3}-\d{4}$/.test(s) ||
         /^\d{4}\/\d{2}\/\d{2}$/.test(s);
}

// Detect if the first row is data (no header row) by checking if it starts with a date-like value
function hasHeaderRow(firstRowValues) {
  // If the first field looks like a date, it's probably data, not a header
  if (looksLikeDate(firstRowValues[0])) return false;
  // If any field matches known header names, it's a header row
  const known = [...DATE_HEADERS, ...DESC_HEADERS, ...AMOUNT_HEADERS, ...DEBIT_HEADERS, ...CREDIT_HEADERS];
  const lower = firstRowValues.map(v => v.toLowerCase().trim());
  if (lower.some(h => known.some(k => h.includes(k)))) return true;
  // Default: treat as header
  return true;
}

// For headerless CSVs, infer column roles from data patterns
function inferColumnMapping(sampleRows, colCount) {
  const roles = new Array(colCount).fill(null);

  // Analyze a few sample rows to determine column types
  const samples = sampleRows.slice(0, Math.min(10, sampleRows.length));

  for (let col = 0; col < colCount; col++) {
    let dateCount = 0, numCount = 0, textCount = 0, emptyCount = 0;
    for (const row of samples) {
      const val = (row[col] || '').trim();
      if (!val) { emptyCount++; continue; }
      if (looksLikeDate(val)) dateCount++;
      else if (/^-?[\d,]+\.?\d*$/.test(val.replace(/[$]/g, ''))) numCount++;
      else textCount++;
    }
    if (dateCount > samples.length * 0.5) roles[col] = 'date';
    else if (textCount > samples.length * 0.5) roles[col] = 'description';
    else if (numCount > 0 || emptyCount > 0) roles[col] = 'number';
  }

  // Build synthetic headers based on detected roles
  // Common bank format: Date, Description, Debit, Credit, Balance
  const headers = [];
  let dateAssigned = false, descAssigned = false;
  const numberCols = [];

  for (let col = 0; col < colCount; col++) {
    if (roles[col] === 'date' && !dateAssigned) {
      headers.push('date');
      dateAssigned = true;
    } else if (roles[col] === 'description' && !descAssigned) {
      headers.push('description');
      descAssigned = true;
    } else if (roles[col] === 'number') {
      numberCols.push(col);
      headers.push(`_num${numberCols.length}`); // placeholder
    } else {
      headers.push(`_col${col}`);
    }
  }

  // Assign number columns: if 3 number cols → debit, credit, balance
  // if 2 number cols → could be amount + balance, or debit + credit
  // if 1 number col → amount
  if (numberCols.length >= 3) {
    headers[numberCols[0]] = 'debit';
    headers[numberCols[1]] = 'credit';
    headers[numberCols[2]] = 'balance';
  } else if (numberCols.length === 2) {
    // Check if one column has many empties (debit/credit pattern)
    const samples1 = sampleRows.map(r => (r[numberCols[0]] || '').trim());
    const samples2 = sampleRows.map(r => (r[numberCols[1]] || '').trim());
    const empties1 = samples1.filter(v => !v).length;
    const empties2 = samples2.filter(v => !v).length;
    if (empties1 > 2 || empties2 > 2) {
      headers[numberCols[0]] = 'debit';
      headers[numberCols[1]] = 'credit';
    } else {
      headers[numberCols[0]] = 'amount';
      headers[numberCols[1]] = 'balance';
    }
  } else if (numberCols.length === 1) {
    headers[numberCols[0]] = 'amount';
  }

  return headers;
}

export function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const firstRowValues = parseLine(lines[0]);
  const headerless = !hasHeaderRow(firstRowValues);

  let headers;
  let dataStartIndex;

  if (headerless) {
    // Parse all lines as data rows first to infer column types
    const allParsed = lines.map(l => parseLine(l));
    headers = inferColumnMapping(allParsed, firstRowValues.length);
    dataStartIndex = 0;
  } else {
    headers = firstRowValues;
    dataStartIndex = 1;
    if (lines.length < 2) return { headers: [], rows: [] };
  }

  const rows = [];
  for (let i = dataStartIndex; i < lines.length; i++) {
    const vals = parseLine(lines[i]);
    if (vals.length >= headers.length) {
      const row = {};
      headers.forEach((h, idx) => row[h] = vals[idx]);
      rows.push(row);
    } else if (vals.length > 0 && vals.length >= headers.length - 2) {
      const row = {};
      headers.forEach((h, idx) => row[h] = vals[idx] ?? '');
      rows.push(row);
    }
  }
  return { headers, rows };
}

function parseLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export function generateCSV(rows, headers) {
  const escape = v => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.map(escape).join(',')];
  rows.forEach(row => {
    lines.push(headers.map(h => escape(row[h])).join(','));
  });
  return lines.join('\n');
}

export function autoMapColumns(headers) {
  const lower = headers.map(h => h.toLowerCase().trim());
  const mapping = { date: null, description: null, amount: null, debit: null, credit: null };

  lower.forEach((h, i) => {
    if (!mapping.date && DATE_HEADERS.some(d => h.includes(d))) mapping.date = headers[i];
    if (!mapping.description && DESC_HEADERS.some(d => h.includes(d))) mapping.description = headers[i];
    if (!mapping.amount && AMOUNT_HEADERS.some(d => h.includes(d))) mapping.amount = headers[i];
    if (!mapping.debit && DEBIT_HEADERS.some(d => h.includes(d))) mapping.debit = headers[i];
    if (!mapping.credit && CREDIT_HEADERS.some(d => h.includes(d))) mapping.credit = headers[i];
  });

  return mapping;
}

// Patterns for transfers and non-spending transactions
const TRANSFER_PATTERNS = [
  /^payment\s*[-–—]\s*thank\s*you/i,
  /^(scotiabank|td|rbc|bmo|cibc|national bank|desjardins)\s*payment/i,
  /\bpayment\b.*\bthank\b/i,
  /\btfr[-\s]*(fr|to)\b/i,
  /\btransfer\b/i,
  /\betransfer\b/i,
  /\be-transfer\b/i,
  /\binterac\b.*\b(send|receive|e-transfer)\b/i,
  /\bmobile deposit\b/i,
  /\beft\b/i,
];

const PAYROLL_PATTERNS = [
  /\bpay(roll)?\b/i,
  /\bdirect\s*dep(osit)?\b/i,
  /\bsalary\b/i,
  /\bwage/i,
  /\bemployer\b/i,
  /battle\s*river/i,
];

const GOVERNMENT_PATTERNS = [
  /\bgst\s*(credit|rebate|hst)\b/i,
  /\bcarbon\s*tax\b/i,
  /\bclimate\s*action\b/i,
  /\bccb\b/i,  // Canada Child Benefit
  /\bchild\s*benefit\b/i,
  /\btrillium\b/i,
  /\bcra\b/i,
  /\bgoc\b.*\bdep\b/i,
  /\bgov(ernment)?\s*(of)?\s*can(ada)?\b/i,
  /\bgov(ernment)?\s*(of)?\s*alb(erta)?\b/i,
  /\bei\s*(benefit|payment)\b/i,
  /\bcpp\b/i,
  /\boas\b/i,
];

const DIVIDEND_PATTERNS = [
  /\bdividend\b/i,
  /\bdiv\b/i,
  /\bcash\s*div\b/i,
  /\bdist(ribution)?\b/i,
  /\bdrip\b/i,
];

const INTEREST_PATTERNS = [
  /\bint\s*fr\b/i,
  /\binterest\b/i,
  /\bint\s*@\b/i,
];

const RENT_MORTGAGE_PATTERNS = [
  /\bmortgage\b/i,
  /\btd\s*mortgage\b/i,
  /\brent\b/i,
  /\blandlord\b/i,
  /\bcondo\s*fee\b/i,
  /\bstrata\b/i,
  /\bproperty\s*tax\b/i,
];

const CHILDCARE_PATTERNS = [
  /\bdaycare\b/i,
  /\bchild\s*care\b/i,
  /\bpreschool\b/i,
  /\bnursery\b/i,
  /\bbabysit/i,
];

export function autoCategorize(description) {
  if (!description) return 'Other';
  const lower = description.toLowerCase();

  // Check transfers first — these aren't real income or expenses
  if (TRANSFER_PATTERNS.some(p => p.test(description))) return 'Transfer';

  // Check payroll (real income)
  if (PAYROLL_PATTERNS.some(p => p.test(description))) return 'Income';

  // Government benefits
  if (GOVERNMENT_PATTERNS.some(p => p.test(description))) return 'Government Benefits';

  // Dividends / investment income
  if (DIVIDEND_PATTERNS.some(p => p.test(description))) return 'Investment Income';

  // Interest charges
  if (INTEREST_PATTERNS.some(p => p.test(description))) return 'Other';

  // Rent/Mortgage
  if (RENT_MORTGAGE_PATTERNS.some(p => p.test(description))) return 'Rent/Mortgage';

  // Childcare
  if (CHILDCARE_PATTERNS.some(p => p.test(description))) return 'Childcare';

  // Merchant keyword matching
  for (const [category, keywords] of Object.entries(MERCHANT_CATEGORIES)) {
    if (keywords.some(kw => lower.includes(kw))) return category;
  }

  return 'Other';
}
