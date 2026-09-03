// Regression coverage for the streaming timeout/retry bug: the 60s timeout
// used to race a rejecting timer against the stream instead of aborting it,
// so a slow request kept emitting chunks to the renderer after the "timed
// out" error was already shown, and — because the timeout error carried no
// status — _withRetry treated it as retryable, so a single hang could cost
// up to three 60-second waits.
jest.useFakeTimers();

let nextStreamBehavior = 'success';
const abortMock = jest.fn();
const streamMock = jest.fn(() => {
  const behavior = nextStreamBehavior;
  let textCb = null;
  return {
    on(event, cb) {
      if (event === 'text') textCb = cb;
      return this;
    },
    abort: abortMock,
    finalMessage: () => {
      if (behavior === 'success') {
        textCb?.('hello');
        return Promise.resolve({ content: [{ type: 'text', text: 'hello' }] });
      }
      if (behavior === 'hang') {
        // Never resolves on its own — only settles once abort() is called.
        return new Promise((_, reject) => {
          abortMock.mockImplementationOnce(() => reject(new Error('Request was aborted')));
        });
      }
      if (behavior === 'server-error') {
        const err = new Error('Internal server error');
        err.status = 500;
        return Promise.reject(err);
      }
      throw new Error(`unknown behavior: ${behavior}`);
    },
  };
});

jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: { stream: streamMock },
  }));
});

const { AiService } = require('../src/main/ai-service.js');

describe('AiService.chat streaming timeout', () => {
  let aiService;

  beforeEach(() => {
    aiService = new AiService();
    abortMock.mockClear();
    streamMock.mockClear();
    nextStreamBehavior = 'success';
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  test('a hung stream is aborted after 60s instead of left running', async () => {
    nextStreamBehavior = 'hang';

    const chatPromise = aiService.chat('fake-key', 'claude-test-model', 'are you there?', null, null);
    // Let the promise's synchronous setup (including the setTimeout call) run.
    await Promise.resolve();

    expect(abortMock).not.toHaveBeenCalled();
    jest.advanceTimersByTime(60000);

    await expect(chatPromise).rejects.toThrow('AI response timed out after 60 seconds');
    expect(abortMock).toHaveBeenCalledTimes(1);
  });

  test('a timeout is not retried — only one stream attempt is made', async () => {
    nextStreamBehavior = 'hang';

    const chatPromise = aiService.chat('fake-key', 'claude-test-model', 'are you there?', null, null);
    await Promise.resolve();
    jest.advanceTimersByTime(60000);
    await expect(chatPromise).rejects.toThrow('AI response timed out after 60 seconds');

    expect(streamMock).toHaveBeenCalledTimes(1);
  });

  test('a real (non-timeout) retryable error is still retried up to the normal limit', async () => {
    nextStreamBehavior = 'server-error';

    const chatPromise = aiService.chat('fake-key', 'claude-test-model', 'hi', null, null);
    const assertion = expect(chatPromise).rejects.toThrow('Internal server error');
    // Advance past both inter-attempt retry delays (1000ms each).
    await jest.advanceTimersByTimeAsync(1000);
    await jest.advanceTimersByTimeAsync(1000);
    await assertion;

    expect(streamMock).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  test('a fast successful response does not call abort', async () => {
    nextStreamBehavior = 'success';
    const reply = await aiService.chat('fake-key', 'claude-test-model', 'hi', null, null);
    expect(reply).toBe('hello');
    expect(abortMock).not.toHaveBeenCalled();
  });
});
