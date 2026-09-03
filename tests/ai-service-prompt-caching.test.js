// Regression coverage for finding M1: AiService.chat() sent its ~90KB+
// knowledge base as a plain string in `system` on every single call, with
// no cache_control — Anthropic's prompt caching requires the cacheable
// portion to be its own content block carrying cache_control, not mixed
// into one string with per-request content (the financial context, which
// changes with the user's data on every call and so must stay outside the
// cached block or it would invalidate the cache on every request anyway).
jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      stream: jest.fn((params) => {
        let textCb = null;
        return {
          on(event, cb) {
            if (event === 'text') textCb = cb;
            return this;
          },
          finalMessage: async () => {
            textCb?.('ok');
            return { content: [{ type: 'text', text: 'ok' }] };
          },
        };
      }),
    },
  }));
});

const Anthropic = require('@anthropic-ai/sdk');
const { AiService } = require('../src/main/ai-service.js');

describe('AiService prompt caching', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('system is a content-block array with cache_control on the knowledge-base block only', async () => {
    const aiService = new AiService();
    aiService.knowledgeBase = 'some knowledge base text';

    await aiService.chat('fake-key', 'claude-test-model', 'hello', null, null);

    const instance = Anthropic.mock.results[0].value;
    const params = instance.messages.stream.mock.calls[0][0];

    expect(Array.isArray(params.system)).toBe(true);
    expect(params.system.length).toBe(2);

    const [kbBlock, dynamicBlock] = params.system;
    expect(kbBlock.text).toContain('some knowledge base text');
    expect(kbBlock.cache_control).toEqual({ type: 'ephemeral' });

    // The dynamic (per-request, per-user) financial-context block must NOT
    // carry cache_control — caching it would either be a no-op (data
    // changes every call, so it never actually hits) or, worse, freeze
    // stale financial data into a "cached" prefix.
    expect(dynamicBlock.cache_control).toBeUndefined();
  });

  test('the knowledge-base block is byte-for-byte identical across consecutive calls with the same KB', async () => {
    // cache_control only helps if the cached block's content is an exact
    // match to the previous call — otherwise every request is a cache miss
    // regardless of the flag. financial context differs between calls
    // (different data snapshots), but the KB block must not.
    const aiService = new AiService();
    aiService.knowledgeBase = 'stable knowledge base content';

    await aiService.chat('fake-key', 'claude-test-model', 'first message', { financials: { netWorth: 100 } }, null);
    await aiService.chat('fake-key', 'claude-test-model', 'second message', { financials: { netWorth: 200 } }, null);

    const instance = Anthropic.mock.results[0].value;
    const [firstCallParams, secondCallParams] = instance.messages.stream.mock.calls.map((c) => c[0]);

    expect(firstCallParams.system[0].text).toBe(secondCallParams.system[0].text);
    expect(firstCallParams.system[1].text).not.toBe(secondCallParams.system[1].text);
  });
});
