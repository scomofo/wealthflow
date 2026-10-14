const { parseCSV, generateCSV, autoMapColumns } = require('../src/renderer/js/utils/csv-parser.js');

test('a CSV export round trip preserves quoted commas, quotes and embedded newlines', () => {
  const rows = [{ date: '2026-10-14', description: 'Market, "north"\nEdmonton', amount: '-12.50', category: 'Food/Groceries' }];
  const headers = ['date', 'description', 'amount', 'category'];
  expect(parseCSV(generateCSV(rows, headers))).toEqual({ headers, rows });
});

test('unquoted extra columns cannot truncate a thousands-formatted amount', () => {
  expect(() => parseCSV('date,description,amount\n2026-10-14,Salary,1,234.56')).toThrow(/Row 2/);
});

test('malformed quoting and duplicate headers are actionable errors', () => {
  expect(() => parseCSV('date,description,amount\n2026-10-14,"Unclosed,-20')).toThrow(/Unclosed quoted field/);
  expect(() => parseCSV('date,description,amount\n2026-10-14,"Purchase"oops,-20')).toThrow(/closing quote/);
  expect(() => parseCSV('date,amount,amount\n2026-10-14,-20,-30')).toThrow(/Duplicate/);
});

test('short rows remain available for preview validation instead of disappearing', () => {
  expect(parseCSV('date,description,amount,category\n2026-10-14,Incomplete')).toEqual({
    headers: ['date', 'description', 'amount', 'category'],
    rows: [{ date: '2026-10-14', description: 'Incomplete', amount: '', category: '' }],
  });
});

test('handles a BOM, CRLF, blank records and ordinary escaped CSV fields', () => {
  const parsed = parseCSV('\uFEFFdate,description,amount\r\n\r\n2026-10-14,"Store ""North""",-20\r\n');
  expect(parsed.rows).toEqual([{ date: '2026-10-14', description: 'Store "North"', amount: '-20' }]);
});

test('headerless compact dates retain their first transaction', () => {
  const parsed = parseCSV('20261014,Coffee,-20\n20261015,Tea,-5');
  expect(parsed.rows).toHaveLength(2);
  expect(autoMapColumns(parsed.headers)).toMatchObject({ date: 'date', description: 'description', amount: 'amount' });
  expect(parsed.rows[0].date).toBe('20261014');
});
