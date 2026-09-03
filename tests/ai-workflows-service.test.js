// Regression coverage for finding M4: AiWorkflowService.runWorkflow()
// computed validateWorkflowResult(...) but only logged a warning on
// failure — invalid data (e.g. missing summary/recommendation, which
// normalizeWorkflowResult does not fill in) was normalized and returned to
// the renderer anyway. It also never checked the API response's
// stop_reason, so a response cut off by max_tokens that still happened to
// parse as syntactically valid (but incomplete) JSON was returned as if
// complete, with no signal that content was missing.
jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: { create: jest.fn() },
  }));
});

const Anthropic = require('@anthropic-ai/sdk');
const { AiWorkflowService } = require('../src/main/ai-workflows.js');

function mockResponse({ text, stop_reason = 'end_turn' }) {
  return { content: [{ text }], stop_reason };
}

describe('AiWorkflowService.runWorkflow', () => {
  let service;
  let create;

  beforeEach(() => {
    service = new AiWorkflowService();
    service._ensureClient('fake-key'); // construct the mocked client up front
    create = Anthropic.mock.results[Anthropic.mock.results.length - 1].value.messages.create;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('a response truncated by max_tokens returns a fallback, not partial data', async () => {
    create.mockResolvedValue(mockResponse({
      // Syntactically valid JSON (missing next_actions/tradeoffs, but those
      // get defaulted to [] by normalizeWorkflowResult) — this must be
      // rejected on stop_reason alone, not on whether it happens to parse.
      text: '{"summary":"Contribute to your TFSA first","recommendation":{"primary_action":"TFSA"}}',
      stop_reason: 'max_tokens',
    }));

    const result = await service.runWorkflow('fake-key', 'claude-test-model', 'tfsa_rrsp_optimizer', {});

    expect(result._fallback).toBe(true);
    expect(result.summary).toBe('The advisor was unable to complete this analysis.');
  });

  test('a response missing required schema fields returns a fallback, not normalized invalid data', async () => {
    create.mockResolvedValue(mockResponse({
      // No "summary" and no "recommendation" — fails validateWorkflowResult.
      text: '{"why":["reason one"],"tradeoffs":[],"next_actions":[]}',
    }));

    const result = await service.runWorkflow('fake-key', 'claude-test-model', 'tfsa_rrsp_optimizer', {});

    expect(result._fallback).toBe(true);
  });

  test('a valid, complete response is returned normally, not as a fallback', async () => {
    create.mockResolvedValue(mockResponse({
      text: JSON.stringify({
        summary: 'Contribute to your TFSA first',
        recommendation: { primary_action: 'TFSA' },
        why: ['Tax-free growth'],
        tradeoffs: ['Less RRSP deduction'],
        next_actions: ['Set up automatic TFSA contributions'],
      }),
    }));

    const result = await service.runWorkflow('fake-key', 'claude-test-model', 'tfsa_rrsp_optimizer', {});

    expect(result._fallback).toBeUndefined();
    expect(result.summary).toBe('Contribute to your TFSA first');
  });
});
