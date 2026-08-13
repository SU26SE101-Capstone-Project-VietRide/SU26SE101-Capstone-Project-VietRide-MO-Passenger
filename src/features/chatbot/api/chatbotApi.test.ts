const mockAuthenticatedFetch = jest.fn();
const mockPost = jest.fn();

jest.mock('@shared/api/authenticatedFetch', () => ({
  authenticatedFetch: (...args: unknown[]) => mockAuthenticatedFetch(...args),
}));

jest.mock('@shared/api/axiosInstance', () => ({
  apiClient: {
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

import { streamChat, submitChatFeedback } from './chatbotApi';
import {
  MAX_ASSISTANT_CHARACTERS,
  MAX_SSE_STREAM_BYTES,
} from '../constants/chatLimits';

const CONVERSATION_ID = '33333333-3333-4333-8333-333333333333';
const USER_MESSAGE_ID = '44444444-4444-4444-8444-444444444444';
const ASSISTANT_MESSAGE_ID = '55555555-5555-4555-8555-555555555555';

const doneFrame = [
  'event: done',
  `data: {"conversationId":"${CONVERSATION_ID}","userMessageId":"${USER_MESSAGE_ID}","assistantMessageId":"${ASSISTANT_MESSAGE_ID}","citations":[{"title":"Passenger policy","section":null}]}`,
  '',
  '',
].join('\n');

const makeStreamResponse = (frames: string[], hangsAfterFrames = false) => {
  let frameIndex = 0;
  const read = jest.fn(() => {
    if (frameIndex < frames.length) {
      const value = new TextEncoder().encode(frames[frameIndex]);
      frameIndex += 1;
      return Promise.resolve({ value, done: false });
    }

    if (hangsAfterFrames) {
      return new Promise<never>(() => undefined);
    }

    return Promise.resolve({ value: undefined, done: true });
  });
  const cancel = jest.fn().mockResolvedValue(undefined);
  const releaseLock = jest.fn();

  return {
    response: {
      ok: true,
      status: 200,
      headers: { get: () => 'text/event-stream; charset=utf-8' },
      body: { getReader: () => ({ read, cancel, releaseLock }) },
    },
    read,
    cancel,
    releaseLock,
  };
};

describe('chatbotApi', () => {
  beforeEach(() => {
    mockAuthenticatedFetch.mockReset();
    mockPost.mockReset();
  });

  it('streams tokens, returns done metadata, and stops reading at the terminal event', async () => {
    const stream = makeStreamResponse(
      [`event: token\ndata: {"content":"Xin chào"}\n\n${doneFrame}`],
      true,
    );
    mockAuthenticatedFetch.mockResolvedValue(stream.response);
    const onToken = jest.fn();

    await expect(
      streamChat(
        { message: '  chính sách vé  ', conversationId: CONVERSATION_ID },
        { onToken },
        new AbortController().signal,
      ),
    ).resolves.toEqual({
      conversationId: CONVERSATION_ID,
      userMessageId: USER_MESSAGE_ID,
      assistantMessageId: ASSISTANT_MESSAGE_ID,
      citations: [{ title: 'Passenger policy', section: null }],
    });

    expect(onToken).toHaveBeenCalledWith('Xin chào');
    expect(stream.read).toHaveBeenCalledTimes(1);
    expect(stream.cancel).toHaveBeenCalledTimes(1);
    expect(stream.releaseLock).toHaveBeenCalledTimes(1);
    expect(mockAuthenticatedFetch).toHaveBeenCalledWith(
      '/rag/chat',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Idempotency-Key': expect.stringMatching(
            /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
          ),
        }),
        body: JSON.stringify({
          message: '  chính sách vé  ',
          conversationId: CONVERSATION_ID,
        }),
      }),
    );
  });

  it('rejects an SSE error event even though HTTP succeeded', async () => {
    const stream = makeStreamResponse([
      'event: error\ndata: {"code":"RAG_PROVIDER_UNAVAILABLE","message":"busy"}\n\n',
    ]);
    mockAuthenticatedFetch.mockResolvedValue(stream.response);

    await expect(
      streamChat(
        { message: 'policy' },
        { onToken: jest.fn() },
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({ code: 'RAG_PROVIDER_UNAVAILABLE' });
  });

  it('rejects an incomplete stream that ends without done or error', async () => {
    const stream = makeStreamResponse([
      'event: token\ndata: {"content":"partial"}\n\n',
    ]);
    mockAuthenticatedFetch.mockResolvedValue(stream.response);

    await expect(
      streamChat(
        { message: 'policy' },
        { onToken: jest.fn() },
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({ code: 'RAG_STREAM_INTERRUPTED' });
  });

  it('reports activity for comments and unknown heartbeat events', async () => {
    const stream = makeStreamResponse([
      ': keep-alive\n\n',
      'event: heartbeat\ndata: {}\n\n',
      doneFrame,
    ]);
    mockAuthenticatedFetch.mockResolvedValue(stream.response);
    const onActivity = jest.fn();
    const onToken = jest.fn();

    await expect(
      streamChat(
        { message: 'policy' },
        { onActivity, onToken },
        new AbortController().signal,
      ),
    ).resolves.toMatchObject({ conversationId: CONVERSATION_ID });

    expect(onActivity).toHaveBeenCalledTimes(3);
    expect(onToken).not.toHaveBeenCalled();
  });

  it('rejects assistant output beyond the retained text cap and cancels the reader', async () => {
    const oversizedToken = JSON.stringify({
      content: 'x'.repeat(MAX_ASSISTANT_CHARACTERS + 1),
    });
    const stream = makeStreamResponse(
      [`event: token\ndata: ${oversizedToken}\n\n`],
      true,
    );
    mockAuthenticatedFetch.mockResolvedValue(stream.response);
    const onToken = jest.fn();

    await expect(
      streamChat(
        { message: 'policy' },
        { onToken },
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({ code: 'RAG_STREAM_LIMIT_EXCEEDED' });

    expect(onToken).not.toHaveBeenCalled();
    expect(stream.cancel).toHaveBeenCalledTimes(1);
    expect(stream.releaseLock).toHaveBeenCalledTimes(1);
  });

  it('bounds raw stream bytes even when the payload contains only discarded comments', async () => {
    const stream = makeStreamResponse(
      [`:${'x'.repeat(MAX_SSE_STREAM_BYTES)}\n`],
      true,
    );
    mockAuthenticatedFetch.mockResolvedValue(stream.response);

    await expect(
      streamChat(
        { message: 'policy' },
        { onToken: jest.fn() },
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({ code: 'RAG_STREAM_LIMIT_EXCEEDED' });

    expect(stream.cancel).toHaveBeenCalledTimes(1);
    expect(stream.releaseLock).toHaveBeenCalledTimes(1);
  });

  it('maps pre-stream HTTP error envelopes to ApiRequestError', async () => {
    mockAuthenticatedFetch.mockResolvedValue({
      ok: false,
      status: 429,
      headers: { get: () => 'application/json' },
      json: async () => ({
        success: false,
        statusCode: 429,
        error: {
          code: 'RAG_RATE_LIMIT_EXCEEDED',
          message: 'Too many requests',
        },
      }),
    });

    await expect(
      streamChat(
        { message: 'policy' },
        { onToken: jest.fn() },
        new AbortController().signal,
      ),
    ).rejects.toEqual(
      expect.objectContaining({
        code: 'RAG_RATE_LIMIT_EXCEEDED',
        statusCode: 429,
      }),
    );
  });

  it('submits feedback through the existing API client and unwraps the envelope', async () => {
    const feedback = {
      id: 'feedback-id',
      messageId: ASSISTANT_MESSAGE_ID,
      conversationId: CONVERSATION_ID,
      userId: 'user-id',
      rating: 1 as const,
      createdAt: '2026-07-13T00:00:00.000Z',
      updatedAt: '2026-07-13T00:00:00.000Z',
    };
    mockPost.mockResolvedValue({
      data: { success: true, statusCode: 201, data: feedback },
    });

    await expect(submitChatFeedback(ASSISTANT_MESSAGE_ID, 1)).resolves.toEqual(
      feedback,
    );
    expect(mockPost).toHaveBeenCalledWith(
      `/rag/messages/${ASSISTANT_MESSAGE_ID}/feedback`,
      { rating: 1 },
      expect.objectContaining({
        headers: expect.objectContaining({
          'Idempotency-Key': expect.stringMatching(
            /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
          ),
        }),
      }),
    );
  });

  it('rejects an invalid feedback message ID before making a request', async () => {
    await expect(submitChatFeedback('../message', 1)).rejects.toThrow(
      'Invalid assistant message ID.',
    );
    expect(mockPost).not.toHaveBeenCalled();
  });
});
