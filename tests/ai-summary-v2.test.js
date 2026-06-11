const { generateAISummary } = require('../src/renderer/js/utils/ai-summary.js');
const { renderAISummary } = require('../src/renderer/js/components/ai-summary.js');

describe('generateAISummary V2', () => {
  test('connects budget and debt actions into one financial narrative', () => {
    const summary = generateAISummary(
      [
        {
          title: 'Reduce Food spending by $180 this month',
          category: 'budget',
          score: 95,
          impact_text: 'Freeing up $180/mo improves monthly cash flow.',
        },
        {
          title: 'Accelerate payoff on Visa (19.99% APR)',
          category: 'debt',
          score: 91,
          impact_text: 'Paying down $4,500 at 19.99% saves significant interest.',
        },
      ],
      { savingsRate: 6, totalDebt: 14500, income: 5200, expenses: 4888 },
      'debt_reduction'
    );

    expect(summary.headline).toBe('This month, the clearest move is freeing up cash flow and using it to reduce interest drag.');
    expect(summary.bullets).toEqual([
      'Reducing Food spending by $180 this month creates room in the monthly plan.',
      'Accelerating Visa payoff addresses high-interest debt before it compounds further.',
    ]);
    expect(summary.nextFocus).toBe('Start with the highest-scoring action: Reduce Food spending by $180 this month.');
    expect(summary.confidence).toBe('high');
  });

  test('uses financial state when there are no open actions', () => {
    const summary = generateAISummary([], { savingsRate: 4, totalDebt: 22000 }, 'cashflow_improvement');

    expect(summary.headline).toBe('Cash flow is tight right now, so the next useful step is finding one manageable adjustment.');
    expect(summary.bullets).toEqual([
      'Savings rate is below 10%, so small spending changes matter more this month.',
      'Refresh actions after adding recent transactions for more precise guidance.',
    ]);
    expect(summary.nextFocus).toBe('Add or import recent transactions, then refresh Next Best Actions.');
    expect(summary.confidence).toBe('medium');
  });

  test('preserves decimal budget amounts in generated bullets', () => {
    const summary = generateAISummary(
      [
        {
          title: 'Reduce Food spending by $180.75 this month',
          category: 'budget',
          score: 95,
        },
      ],
      { savingsRate: 6 },
      'spending_control'
    );

    expect(summary.bullets).toEqual([
      'Reducing Food spending by $180.75 this month creates room in the monthly plan.',
    ]);
  });

  test('escapes summary headline bullets and next focus when rendering', () => {
    const html = renderAISummary({
      headline: '<script>alert("headline")</script>',
      bullets: [
        '<img src=x onerror="alert(\'bullet\')">',
      ],
      nextFocus: 'Use <b onclick="alert(\'focus\')">focus</b> now',
      confidence: 'high',
    });

    expect(html).toContain('&lt;script&gt;alert(&quot;headline&quot;)&lt;/script&gt;');
    expect(html).toContain('&lt;img src=x onerror=&quot;alert(&#39;bullet&#39;)&quot;&gt;');
    expect(html).toContain('Use &lt;b onclick=&quot;alert(&#39;focus&#39;)&quot;&gt;focus&lt;/b&gt; now');
    expect(html).not.toContain('<script>alert("headline")</script>');
    expect(html).not.toContain('<img src=x onerror="alert(\'bullet\')">');
    expect(html).not.toContain('<b onclick="alert(\'focus\')">focus</b>');
  });
});
