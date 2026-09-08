const { AiWorkflowService } = require('../src/main/ai-workflows');

function makeService(response) {
  const service = new AiWorkflowService();
  service._lastKey = 'test-key';
  service.client = {
    messages: {
      create: jest.fn(async () => response),
    },
  };
  return service;
}

function validMonthlyResult() {
  return {
    workflow_type: 'monthly_action_planner',
    summary: 'Prioritize one spending adjustment this month.',
    recommendation: { primary_action: 'Reduce discretionary spending' },
    top_actions: [
      { title: 'Trim dining', impact: 'Save $150', effort: 'low', priority: 'high' },
    ],
    why: ['Spending is above the selected budget.'],
    confidence: 'medium',
    disclaimer: 'General educational guidance only.',
  };
}

describe('AiWorkflowService strict output handling', () => {
  test('returns a normal result only when the schema is valid', async () => {
    const service = makeService({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: JSON.stringify(validMonthlyResult()) }],
    });

    const result = await service.runWorkflow(
      'test-key',
      'test-model',
      'monthly_action_planner',
      {}
    );

    expect(result._fallback).not.toBe(true);
    expect(result.top_actions).toHaveLength(1);
  });

  test('fails closed when parsed JSON does not match the workflow schema', async () => {
    const invalid = validMonthlyResult();
    invalid.top_actions[0].priority = 'critical';

    const service = makeService({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: JSON.stringify(invalid) }],
    });

    const result = await service.runWorkflow(
      'test-key',
      'test-model',
      'monthly_action_planner',
      {}
    );

    expect(result._fallback).toBe(true);
    expect(result.confidence).toBe('low');
    expect(result.why[0]).toContain('required financial workflow schema');
  });

  test('fails closed when the model hits max_tokens even if JSON parses', async () => {
    const service = makeService({
      stop_reason: 'max_tokens',
      content: [{ type: 'text', text: JSON.stringify(validMonthlyResult()) }],
    });

    const result = await service.runWorkflow(
      'test-key',
      'test-model',
      'monthly_action_planner',
      {}
    );

    expect(result._fallback).toBe(true);
    expect(result.why[0]).toContain('truncated');
  });
});
