import { ApiRequestError } from '@shared/api/errors';
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
});
