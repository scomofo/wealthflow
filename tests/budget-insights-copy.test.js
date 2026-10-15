const fs = require('fs');
const path = require('path');

describe('budget insights copy accurately describes deterministic advice', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'renderer', 'js', 'pages', 'budget.js'),
    'utf8',
  );

  test('does not claim heuristic spending tips are AI-generated', () => {
    expect(source).toContain('Budget Insights');
    expect(source).not.toContain('AI Budget Analysis');
  });

  test('keeps the label connected to actual category spending and savings rate', () => {
    expect(source).toContain('F.catSpending');
    expect(source).toContain('F.savingsRate');
    expect(source).toContain('Top spending:');
  });
});
