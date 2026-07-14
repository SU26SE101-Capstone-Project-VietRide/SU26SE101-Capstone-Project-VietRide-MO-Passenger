import { ApiRequestError } from '@shared/api/errors';
import {
  MAX_CITED_CHUNKS,
  MAX_SSE_EVENT_BYTES,
  MAX_SSE_PENDING_LINE_BYTES,
} from '../constants/chatLimits';
import { parseRagChatSseEvent, SseParser } from './sseParser';
import type { RagChatSseEvent } from '../types/chatbot';

const CONVERSATION_ID = '33333333-3333-4333-8333-333333333333';
const USER_MESSAGE_ID = '44444444-4444-4444-8444-444444444444';
const ASSISTANT_MESSAGE_ID = '55555555-5555-4555-8555-555555555555';
const CHUNK_ID = '66666666-6666-4666-8666-666666666666';

const WIRE_PAYLOAD = [
  'event: token',
  'data: {"content":"Xin chào 👋"}',
  '',
  'event: token',
  'data: {"content":" VietRide"}',
  '',
  'event: done',
  `data: {"conversationId":"${CONVERSATION_ID}","userMessageId":"${USER_MESSAGE_ID}","assistantMessageId":"${ASSISTANT_MESSAGE_ID}","citedChunkIds":["${CHUNK_ID}"]}`,
  '',
  '',
].join('\n');

const collectEvents = (chunks: string[]): RagChatSseEvent[] => {
  const events: RagChatSseEvent[] = [];
  const parser = new SseParser((wireEvent) => {
    const event = parseRagChatSseEvent(wireEvent);
    if (event) events.push(event);
  });

  chunks.forEach((chunk) => parser.feed(chunk));
  parser.finish();
  return events;
};

const makeCitationId = (index: number): string =>
  `00000000-0000-4000-8000-${index.toString(16).padStart(12, '0')}`;

describe('SseParser', () => {
  it('parses multiple token events and the terminal done event', () => {
    expect(collectEvents([WIRE_PAYLOAD])).toEqual([
      { event: 'token', data: { content: 'Xin chào 👋' } },
      { event: 'token', data: { content: ' VietRide' } },
      {
        event: 'done',
        data: {
          conversationId: CONVERSATION_ID,
          userMessageId: USER_MESSAGE_ID,
          assistantMessageId: ASSISTANT_MESSAGE_ID,
          citedChunkIds: [CHUNK_ID],
        },
      },
    ]);
  });

  it('handles every character as an independent transport chunk', () => {
    expect(collectEvents([...WIRE_PAYLOAD])).toHaveLength(3);
  });

  it('handles CRLF, comments, unknown fields, and multiline data', () => {
    const payload = [
      ': keep-alive',
      'retry: 1000',
      'event: token',
      'data: {"content":',
      'data: "hello"}',
      '',
      '',
    ].join('\r\n');

    expect(collectEvents([payload])).toEqual([
      { event: 'token', data: { content: 'hello' } },
    ]);
  });

  it('surfaces malformed JSON as a typed protocol error', () => {
    expect(() => collectEvents(['event: token\ndata: nope\n\n'])).toThrow(ApiRequestError);
  });

  it('rejects an invalid done payload', () => {
    expect(() => collectEvents([
      'event: done\ndata: {"conversationId":"not-a-uuid"}\n\n',
    ])).toThrow('Thông tin hoàn tất hội thoại không hợp lệ.');
  });

  it('ignores forward-compatible unknown event names', () => {
    expect(collectEvents(['event: heartbeat\ndata: {}\n\n'])).toEqual([]);
  });

  it('bounds an unterminated SSE line by its UTF-8 byte length', () => {
    const parser = new SseParser(jest.fn());

    expect(() => parser.feed('x'.repeat(MAX_SSE_PENDING_LINE_BYTES))).not.toThrow();
    expect(() => parser.feed('x')).toThrow(expect.objectContaining({
      code: 'RAG_STREAM_LIMIT_EXCEEDED',
    }));
  });

  it('bounds cumulative bytes across all lines in a single SSE event', () => {
    const parser = new SseParser(jest.fn());
    const eventLineBytes = 'event: token\n'.length;
    const firstDataLine = `data: ${'x'.repeat(30_000)}\n`;
    const finalDataValueLength = MAX_SSE_EVENT_BYTES
      - eventLineBytes
      - firstDataLine.length
      - 'data: \n'.length;

    parser.feed('event: token\n');
    parser.feed(firstDataLine);
    expect(() => parser.feed(`data: ${'x'.repeat(finalDataValueLength)}\n`)).not.toThrow();
    expect(() => parser.feed(': overflow\n')).toThrow(expect.objectContaining({
      code: 'RAG_STREAM_LIMIT_EXCEEDED',
    }));
  });

  it('resets the event byte budget after a blank-line dispatch', () => {
    const onEvent = jest.fn();
    const parser = new SseParser(onEvent);
    const commentPayload = 'x'.repeat(MAX_SSE_EVENT_BYTES - ':'.length - 1);

    parser.feed(`:${commentPayload}\n\n`);
    expect(() => parser.feed(`:${commentPayload}\n\n`)).not.toThrow();
    expect(onEvent).not.toHaveBeenCalled();
  });

  it('accepts the citation cap and rejects one citation beyond it', () => {
    const baseDonePayload = {
      conversationId: CONVERSATION_ID,
      userMessageId: USER_MESSAGE_ID,
      assistantMessageId: ASSISTANT_MESSAGE_ID,
    };
    const accepted = parseRagChatSseEvent({
      event: 'done',
      data: JSON.stringify({
        ...baseDonePayload,
        citedChunkIds: Array.from(
          { length: MAX_CITED_CHUNKS },
          (_, index) => makeCitationId(index),
        ),
      }),
    });

    expect(accepted?.event).toBe('done');
    expect(() => parseRagChatSseEvent({
      event: 'done',
      data: JSON.stringify({
        ...baseDonePayload,
        citedChunkIds: Array.from(
          { length: MAX_CITED_CHUNKS + 1 },
          (_, index) => makeCitationId(index),
        ),
      }),
    })).toThrow(expect.objectContaining({
      code: 'RAG_STREAM_LIMIT_EXCEEDED',
    }));
  });
});
