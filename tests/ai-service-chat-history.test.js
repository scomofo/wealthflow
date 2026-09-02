// Regression coverage for the chat-history trimming bug: chat() used to
// slice(-20) after pushing the pending user message, which could strip an
// odd number of entries and leave history starting with an assistant turn.
// The Messages API rejects that with a non-retryable 400 on every call
// after, until the user manually clears history.
jest.useFakeTimers();

jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      stream: jest.fn((params) => {
        // Simulate the real API's constraint: reject if the first message
        // in the sent history is not from the user.
        const first = params.messages[0];
        if (first && first.role !== 'user') {
          const err = new Error('messages: first message must use the "user" role');
          err.status = 400;
          throw err;
        }
        const replyText = `reply to: ${params.messages[params.messages.length - 1].content}`;
        let textCb = null;
        return {
          on(event, cb) {
            if (event === 'text') textCb = cb;
            return this;
          },
          finalMessage: async () => {
            textCb?.(replyText);
            return { content: [{ type: 'text', text: replyText }] };
          },
        };
      }),
    },
  }));
});

const { AiService } = require('../src/main/ai-service.js');

describe('AiService.chat conversation history trimming', () => {
  let aiService;

  beforeEach(() => {
    aiService = new AiService();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  test('history never starts with an assistant turn past the 10-exchange window that used to break it', async () => {
    for (let i = 1; i <= 15; i++) {
      const reply = await aiService.chat('fake-key', 'claude-test-model', `message ${i}`, null, null);
      expect(reply).toBe(`reply to: message ${i}`);
      expect(aiService.conversationHistory.length).toBeGreaterThan(0);
      expect(aiService.conversationHistory[0].role).toBe('user');
    }

    // Well past the old bug's failure point (11th message) — every message
    // must have succeeded, and history stays alternating user/assistant.
    expect(aiService.conversationHistory[0].role).toBe('user');
    for (let i = 0; i < aiService.conversationHistory.length; i++) {
      expect(aiService.conversationHistory[i].role).toBe(i % 2 === 0 ? 'user' : 'assistant');
    }
  });

  test('trims from the front in whole pairs, keeping history at or under the cap', async () => {
    for (let i = 1; i <= 15; i++) {
      await aiService.chat('fake-key', 'claude-test-model', `message ${i}`, null, null);
    }
    expect(aiService.conversationHistory.length).toBeLessThanOrEqual(20);
  });
});
