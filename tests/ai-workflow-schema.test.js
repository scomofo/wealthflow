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
      recommendation: {
        primary_action: 'Contribute to TFSA',
        allocation: { tfsa: '100%', rrsp: '0%' },
      },
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

  test('rejects a mismatched workflow type', () => {
    expect(validateWorkflowResult('tfsa_rrsp_optimizer', {
      workflow_type: 'debt_vs_investing',
      summary: 'test',
      recommendation: { primary_action: 'test', allocation: { tfsa: '50%', rrsp: '50%' } },
      why: [], tradeoffs: [], next_actions: [], confidence: 'medium', disclaimer: 'General guidance',
    })).toBe(false);
  });

  test('rejects non-array why for tfsa_rrsp_optimizer', () => {
    expect(validateWorkflowResult('tfsa_rrsp_optimizer', {
      workflow_type: 'tfsa_rrsp_optimizer',
      summary: 'test', recommendation: { primary_action: 'test', allocation: { tfsa: '50%', rrsp: '50%' } },
      why: 'not an array', tradeoffs: [], next_actions: [], confidence: 'medium', disclaimer: 'General guidance',
    })).toBe(false);
  });

  test('rejects invalid confidence and action priority enums', () => {
    expect(validateWorkflowResult('tfsa_rrsp_optimizer', {
      workflow_type: 'tfsa_rrsp_optimizer',
      summary: 'test', recommendation: { primary_action: 'test', allocation: { tfsa: '50%', rrsp: '50%' } },
      why: [], tradeoffs: [],
      next_actions: [{ title: 'Do something', type: 'contribution', priority: 'critical' }],
      confidence: 'certain', disclaimer: 'General guidance',
    })).toBe(false);
  });

  test('accepts valid debt_vs_investing result', () => {
    expect(validateWorkflowResult('debt_vs_investing', {
      workflow_type: 'debt_vs_investing',
      summary: 'Pay the card first',
      recommendation: { primary_action: 'Pay card', priority_order: ['Credit card', 'TFSA'] },
      why: ['APR is high'], tradeoffs: ['Less invested this month'],
      next_actions: [{ title: 'Pay $500', type: 'debt_payment', priority: 'high' }],
      confidence: 'high', disclaimer: 'General guidance',
    })).toBe(true);
  });

  test('accepts valid monthly_action_planner', () => {
    expect(validateWorkflowResult('monthly_action_planner', {
      workflow_type: 'monthly_action_planner',
      summary: 'Top 3', recommendation: { primary_action: 'Reduce spending' },
      top_actions: [{ title: 'Cut food', impact: 'Save $200', effort: 'low', priority: 'high' }],
      why: ['Over budget'], confidence: 'medium', disclaimer: 'General guidance',
    })).toBe(true);
  });

  test('rejects monthly_action_planner without top_actions', () => {
    expect(validateWorkflowResult('monthly_action_planner', {
      workflow_type: 'monthly_action_planner',
      summary: 'test', recommendation: { primary_action: 'test' }, why: [],
      confidence: 'medium', disclaimer: 'General guidance',
    })).toBe(false);
  });

  test('rejects malformed monthly action objects', () => {
    expect(validateWorkflowResult('monthly_action_planner', {
      workflow_type: 'monthly_action_planner',
      summary: 'test', recommendation: { primary_action: 'test' },
      top_actions: [{ title: 'Cut food', impact: 'Save $200', effort: 'tiny', priority: 'high' }],
      why: [], confidence: 'medium', disclaimer: 'General guidance',
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
    expect(normalized.workflow_type).toBe('debt_vs_investing');
  });
});

describe('buildWorkflowFallback', () => {
  test('returns safe fallback', () => {
    const fallback = buildWorkflowFallback('tfsa_rrsp_optimizer', 'Parse error');
    expect(fallback.workflow_type).toBe('tfsa_rrsp_optimizer');
    expect(fallback.summary).toContain('unable');
    expect(fallback.confidence).toBe('low');
    expect(fallback._fallback).toBe(true);
  });
});
