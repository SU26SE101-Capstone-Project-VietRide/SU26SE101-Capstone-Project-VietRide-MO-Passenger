import { ApiRequestError } from '@shared/api/errors';
import type { RagChatSseEvent } from '../types/chatbot';

interface SseWireEvent {
  event: string;
  data: string;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const protocolError = (message: string): ApiRequestError =>
  new ApiRequestError({
    message,
    code: 'RAG_STREAM_INVALID',
  });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isUuid = (value: unknown): value is string =>
  typeof value === 'string' && UUID_PATTERN.test(value);

export const parseRagChatSseEvent = (
  wireEvent: SseWireEvent,
): RagChatSseEvent | null => {
  if (!['token', 'done', 'error'].includes(wireEvent.event)) {
    return null;
  }

  let data: unknown;
  try {
    data = JSON.parse(wireEvent.data);
  } catch {
    throw protocolError('Phản hồi từ trợ lý không đúng định dạng.');
  }

  if (!isRecord(data)) {
    throw protocolError('Dữ liệu phản hồi từ trợ lý không hợp lệ.');
  }

  if (wireEvent.event === 'token') {
    if (typeof data.content !== 'string') {
      throw protocolError('Nội dung phản hồi từ trợ lý không hợp lệ.');
    }
    return { event: 'token', data: { content: data.content } };
  }

  if (wireEvent.event === 'error') {
    if (typeof data.code !== 'string' || typeof data.message !== 'string') {
      throw protocolError('Thông tin lỗi từ trợ lý không hợp lệ.');
    }
    return { event: 'error', data: { code: data.code, message: data.message } };
  }

  if (
    !isUuid(data.conversationId)
    || !isUuid(data.userMessageId)
    || !isUuid(data.assistantMessageId)
    || !Array.isArray(data.citedChunkIds)
    || !data.citedChunkIds.every(isUuid)
  ) {
    throw protocolError('Thông tin hoàn tất hội thoại không hợp lệ.');
  }

  return {
    event: 'done',
    data: {
      conversationId: data.conversationId,
      userMessageId: data.userMessageId,
      assistantMessageId: data.assistantMessageId,
      citedChunkIds: data.citedChunkIds,
    },
  };
};

/** Incremental SSE parser that is safe across arbitrary transport chunk boundaries. */
export class SseParser {
  private pendingText = '';
  private eventName = 'message';
  private dataLines: string[] = [];

  constructor(private readonly onEvent: (event: SseWireEvent) => void) {}

  feed(chunk: string): void {
    this.pendingText += chunk;

    let lineEnd = this.pendingText.indexOf('\n');
    while (lineEnd >= 0) {
      const rawLine = this.pendingText.slice(0, lineEnd);
      this.pendingText = this.pendingText.slice(lineEnd + 1);
      this.processLine(rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine);
      lineEnd = this.pendingText.indexOf('\n');
    }
  }

  finish(): void {
    if (this.pendingText.length > 0) {
      const line = this.pendingText.endsWith('\r')
        ? this.pendingText.slice(0, -1)
        : this.pendingText;
      this.processLine(line);
      this.pendingText = '';
    }

    this.dispatch();
  }

  private processLine(line: string): void {
    if (line.length === 0) {
      this.dispatch();
      return;
    }

    if (line.startsWith(':')) {
      return;
    }

    const separatorIndex = line.indexOf(':');
    const field = separatorIndex >= 0 ? line.slice(0, separatorIndex) : line;
    let value = separatorIndex >= 0 ? line.slice(separatorIndex + 1) : '';
    if (value.startsWith(' ')) {
      value = value.slice(1);
    }

    if (field === 'event') {
      this.eventName = value || 'message';
    } else if (field === 'data') {
      this.dataLines.push(value);
    }
  }

  private dispatch(): void {
    if (this.dataLines.length > 0) {
      this.onEvent({
        event: this.eventName,
        data: this.dataLines.join('\n'),
      });
    }

    this.eventName = 'message';
    this.dataLines = [];
  }
}
