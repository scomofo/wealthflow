const { WORKFLOW_TYPES, validateWorkflowResult, normalizeWorkflowResult, buildWorkflowFallback } = require('../src/main/ai-workflow-schema');

describe('WORKFLOW_TYPES', () => {
  test('defines three workflow types', () => {
    expect(WORKFLOW_TYPES).toContain('tfsa_rrsp_optimizer');
    expect(WORKFLOW_TYPES).toContain('debt_vs_investing');
    expect(WORKFLOW_TYPES).toContain('monthly_action_planner');
  });
});

describe('validateWorkflowResult', () => {
  test('accepts valid tfsa_rrsp_optimizer result', () => {
    const result = {
      workflow_type: 'tfsa_rrsp_optimizer', summary: 'Prioritize TFSA',
      recommendation: { primary_action: 'Contribute to TFSA' },
      why: ['Low income bracket'], tradeoffs: ['Miss RRSP deduction'],
      next_actions: [{ title: 'Contribute $5,000', type: 'contribution', priority: 'high' }],
      confidence: 'medium', disclaimer: 'General guidance only',
    };
    expect(validateWorkflowResult('tfsa_rrsp_optimizer', result)).toBe(true);
  });

  test('rejects missing summary', () => {
    expect(validateWorkflowResult('tfsa_rrsp_optimizer', { workflow_type: 'tfsa_rrsp_optimizer', recommendation: {} })).toBe(false);
  });

  test('rejects missing recommendation', () => {
    expect(validateWorkflowResult('tfsa_rrsp_optimizer', { workflow_type: 'tfsa_rrsp_optimizer', summary: 'test' })).toBe(false);
  });

  test('rejects non-array why for tfsa_rrsp_optimizer', () => {
    expect(validateWorkflowResult('tfsa_rrsp_optimizer', {
      summary: 'test', recommendation: { primary_action: 'test' },
      why: 'not an array', tradeoffs: [], next_actions: [],
    })).toBe(false);
  });

  test('accepts valid monthly_action_planner', () => {
    expect(validateWorkflowResult('monthly_action_planner', {
      summary: 'Top 3', recommendation: { primary_action: 'Reduce spending' },
      top_actions: [{ title: 'Cut food', impact: 'Save $200', effort: 'low', priority: 'high' }],
      why: ['Over budget'], confidence: 'medium', disclaimer: 'General guidance',
    })).toBe(true);
  });

  test('rejects monthly_action_planner without top_actions', () => {
    expect(validateWorkflowResult('monthly_action_planner', {
      summary: 'test', recommendation: { primary_action: 'test' }, why: [],
    })).toBe(false);
  });
});

describe('normalizeWorkflowResult', () => {
  test('adds missing arrays as empty', () => {
    const normalized = normalizeWorkflowResult('tfsa_rrsp_optimizer', {
      summary: 'test', recommendation: { primary_action: 'test' },
    });
    expect(Array.isArray(normalized.why)).toBe(true);
    expect(Array.isArray(normalized.tradeoffs)).toBe(true);
    expect(Array.isArray(normalized.next_actions)).toBe(true);
    expect(normalized.disclaimer).toBeTruthy();
  });

  test('preserves existing values', () => {
    const normalized = normalizeWorkflowResult('debt_vs_investing', {
      summary: 'Pay debt', recommendation: { primary_action: 'Pay CC' },
      why: ['High APR'], tradeoffs: ['Delay growth'],
      next_actions: [{ title: 'Pay $300' }], confidence: 'high', disclaimer: 'Custom',
    });
    expect(normalized.why).toEqual(['High APR']);
    expect(normalized.disclaimer).toBe('Custom');
  });
});

describe('buildWorkflowFallback', () => {
  test('returns valid fallback', () => {
    const fallback = buildWorkflowFallback('tfsa_rrsp_optimizer', 'Parse error');
    expect(fallback.workflow_type).toBe('tfsa_rrsp_optimizer');
    expect(fallback.summary).toContain('unable');
    expect(fallback.confidence).toBe('low');
    expect(fallback._fallback).toBe(true);
  });
});
