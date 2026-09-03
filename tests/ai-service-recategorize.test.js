// Regression coverage for finding M7: the ai:recategorize-others IPC
// handler used to build its own Anthropic client and reimplement the whole
// batch-categorize-and-persist workflow inline, instead of going through
// AiService — duplicating client/retry management and drifting out of sync
// with AiService's other AI call sites (e.g. no retry-on-transient-failure,
// unlike every other AiService method).
jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: { create: jest.fn() },
  }));
});

const Anthropic = require('@anthropic-ai/sdk');
const { AiService } = require('../src/main/ai-service.js');

function mockDatabase(transactions) {
  return {
    getAll: jest.fn(() => transactions),
    run: jest.fn(),
    save: jest.fn(),
  };
}

describe('AiService.recategorizeOtherTransactions', () => {
  let create;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns immediately with no API call when there are no "Other" transactions', async () => {
    const service = new AiService();
    const db = mockDatabase([]);

    const result = await service.recategorizeOtherTransactions('fake-key', 'claude-test-model', db);

    expect(result).toEqual({ categorized: 0, total: 0 });
    expect(db.save).not.toHaveBeenCalled();
  });

  test('persists only the transactions the model actually recategorized, and saves once', async () => {
    const db = mockDatabase([
      { id: 't1', description: 'STARBUCKS', amount: -5.5 },
      { id: 't2', description: 'UNKNOWN MERCHANT', amount: -12 },
    ]);
    const service = new AiService();
    service._ensureClient('fake-key');
    create = Anthropic.mock.results[0].value.messages.create;
    create.mockResolvedValue({ content: [{ text: '["Food/Groceries", "Other"]' }] });

    const result = await service.recategorizeOtherTransactions('fake-key', 'claude-test-model', db);

    expect(result).toEqual({ categorized: 1, total: 2 });
    expect(db.run).toHaveBeenCalledTimes(1);
    expect(db.run).toHaveBeenCalledWith('UPDATE transactions SET category = ? WHERE id = ?', ['Food/Groceries', 't1']);
    expect(db.save).toHaveBeenCalledTimes(1);
  });

  test('retries a transient failure instead of silently giving up on the batch', async () => {
    const db = mockDatabase([{ id: 't1', description: 'GAS STATION', amount: -40 }]);
    const service = new AiService();
    service._ensureClient('fake-key');
    create = Anthropic.mock.results[0].value.messages.create;

    const rateLimitError = new Error('rate limited');
    rateLimitError.status = 429;
    create
      .mockRejectedValueOnce(rateLimitError)
      .mockResolvedValueOnce({ content: [{ text: '["Transport"]' }] });

    const result = await service.recategorizeOtherTransactions('fake-key', 'claude-test-model', db);

    expect(create).toHaveBeenCalledTimes(2);
    expect(result.categorized).toBe(1);
  });
});
