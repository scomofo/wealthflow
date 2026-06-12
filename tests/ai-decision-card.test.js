const { renderDecisionCard } = require('../src/renderer/js/components/ai-decision-card.js');
const { renderActionList } = require('../src/renderer/js/components/ai-action-list.js');
const {
  renderDashboardActionList,
} = require('../src/renderer/js/components/dashboard-action-list.js');

const affordabilityResult = {
  workflow_type: 'affordability_check',
  summary: 'Yes - this looks affordable.',
  recommendation: {
    primary_action: 'Buy the item only after planned bills are covered.',
  },
  why: ['Your current savings buffer is $12,000.'],
  tradeoffs: [],
  next_actions: [
    {
      title: 'Buy the item only if planned bills are covered',
      type: 'affordability',
      priority: 'low',
      impact: 'Keeps the purchase tied to your plan',
    },
  ],
  confidence: 'medium',
  disclaimer: 'This is general educational guidance, not financial advice.',
};

describe('affordability workflow labels', () => {
  test('renders a human-readable label in the decision card', () => {
    expect(renderDecisionCard(affordabilityResult)).toContain(
      'Can I Afford This?'
    );
  });

  test('renders a human-readable label for saved affordability actions', () => {
    const actions = [
      {
        id: 1,
        title: 'Buy the item only if planned bills are covered',
        workflow_type: 'affordability_check',
        status: 'pending',
        priority: 'low',
      },
    ];

    expect(renderActionList(actions)).toContain('Can I Afford This?');
    expect(renderDashboardActionList(actions)).toContain('Can I Afford This?');
  });
});
