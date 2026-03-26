// OFX/QFX Parser for WealthFlow
// Handles both SGML (OFX 1.x) and XML (OFX 2.x) formats

export function parseOFX(text) {
  const transactions = [];

  // Find all STMTTRN blocks
  const trnRegex = /<STMTTRN>([\s\S]*?)(?:<\/STMTTRN>|(?=<STMTTRN>|<\/BANKTRANLIST))/gi;
  let match;

  while ((match = trnRegex.exec(text)) !== null) {
    const block = match[1];
    const tx = {};

    // Extract fields - handles both SGML (no closing tags) and XML
    tx.type = extractField(block, 'TRNTYPE');
    tx.datePosted = extractField(block, 'DTPOSTED');
    tx.amount = extractField(block, 'TRNAMT');
    tx.name = extractField(block, 'NAME');
    tx.memo = extractField(block, 'MEMO');
    tx.fitid = extractField(block, 'FITID');
    tx.checkNum = extractField(block, 'CHECKNUM');

    if (tx.datePosted && tx.amount) {
      transactions.push(tx);
    }
  }

  if (transactions.length === 0) {
    return { headers: [], rows: [] };
  }

  // Convert to standard format matching csv-parser output
  const headers = ['date', 'description', 'amount'];
  const rows = transactions.map(tx => ({
    date: normalizeOFXDate(tx.datePosted),
    description: (tx.name || tx.memo || '').trim(),
    amount: tx.amount,
  }));

  return { headers, rows };
}

function extractField(block, tag) {
  // Try XML style first: <TAG>value</TAG>
  const xmlRegex = new RegExp(`<${tag}>([^<]*)</${tag}>`, 'i');
  let m = block.match(xmlRegex);
  if (m) return m[1].trim();

  // SGML style: <TAG>value\n (value ends at next tag or newline)
  const sgmlRegex = new RegExp(`<${tag}>([^<\\n\\r]*)`, 'i');
  m = block.match(sgmlRegex);
  if (m) return m[1].trim();

  return '';
}

function normalizeOFXDate(dateStr) {
  if (!dateStr) return null;
  // OFX dates are YYYYMMDD or YYYYMMDDHHMMSS[.XXX:GMT]
  const clean = dateStr.replace(/\[.*\]/, '').trim();
  if (clean.length >= 8) {
    const y = clean.slice(0, 4);
    const m = clean.slice(4, 6);
    const d = clean.slice(6, 8);
    return `${y}-${m}-${d}`;
  }
  return null;
}

// Check if text content is OFX format
export function isOFX(text) {
  return /OFXHEADER|<OFX>/i.test(text);
}
