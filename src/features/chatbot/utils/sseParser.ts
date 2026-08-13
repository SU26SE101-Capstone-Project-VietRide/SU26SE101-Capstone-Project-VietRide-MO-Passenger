import { ApiRequestError } from '@shared/api/errors';
import { isUuid } from '@shared/utils/pathSegment';
import {
  MAX_RAG_CITATIONS,
  MAX_SSE_EVENT_BYTES,
  MAX_SSE_PENDING_LINE_BYTES,
} from '../constants/chatLimits';
import type { RagChatSseEvent, RagFriendlyCitation } from '../types/chatbot';
import { createChatStreamLimitError } from './chatStreamError';

interface SseWireEvent {
  event: string;
  data: string;
}

const protocolError = (message: string): ApiRequestError =>
  new ApiRequestError({
    message,
    code: 'RAG_STREAM_INVALID',
  });

/** UTF-8 byte length without allocating another encoded copy of the string. */
const utf8ByteLength = (value: string): number => {
  let bytes = 0;

  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);

    if (codeUnit <= 0x7f) {
      bytes += 1;
    } else if (codeUnit <= 0x7ff) {
      bytes += 2;
    } else if (
      codeUnit >= 0xd800 &&
      codeUnit <= 0xdbff &&
      index + 1 < value.length &&
      value.charCodeAt(index + 1) >= 0xdc00 &&
      value.charCodeAt(index + 1) <= 0xdfff
    ) {
      bytes += 4;
      index += 1;
    } else {
      bytes += 3;
    }
  }

  return bytes;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const parseFriendlyCitations = (
  value: unknown,
): RagFriendlyCitation[] | null => {
  if (!Array.isArray(value)) return null;
  if (value.length > MAX_RAG_CITATIONS) {
    throw createChatStreamLimitError();
  }

  const citations: RagFriendlyCitation[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    if (
      !isRecord(item) ||
      typeof item.title !== 'string' ||
      !item.title.trim() ||
      (item.section !== null && typeof item.section !== 'string')
    ) {
      throw protocolError('Nguồn tham khảo từ trợ lý không hợp lệ.');
    }

    const title = item.title.trim();
    const section =
      typeof item.section === 'string' && item.section.trim()
        ? item.section.trim()
        : null;
    const key = JSON.stringify([title, section]);
    if (seen.has(key)) continue;

    seen.add(key);
    citations.push({ title, section });
  }

  return citations;
};

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

  const citations = parseFriendlyCitations(data.citations);
  const legacyChunkIds = Array.isArray(data.citedChunkIds)
    ? data.citedChunkIds
    : null;

  if (legacyChunkIds && legacyChunkIds.length > MAX_RAG_CITATIONS) {
    throw createChatStreamLimitError();
  }

  if (
    !isUuid(data.conversationId) ||
    !isUuid(data.userMessageId) ||
    !isUuid(data.assistantMessageId) ||
    (citations === null && !legacyChunkIds) ||
    (legacyChunkIds && !legacyChunkIds.every(isUuid))
  ) {
    throw protocolError('Thông tin hoàn tất hội thoại không hợp lệ.');
  }

  return {
    event: 'done',
    data: {
      conversationId: data.conversationId,
      userMessageId: data.userMessageId,
      assistantMessageId: data.assistantMessageId,
      // Rolling-deploy compatibility: old BE UUIDs are validated then discarded.
      citations: citations ?? [],
    },
  };
};

/** Incremental SSE parser that is safe across arbitrary transport chunk boundaries. */
export class SseParser {
  private pendingText = '';
  private pendingTextBytes = 0;
  private eventName = 'message';
  private dataLines: string[] = [];
  private eventBytes = 0;

  constructor(private readonly onEvent: (event: SseWireEvent) => void) {}

  feed(chunk: string): void {
    let cursor = 0;

    while (cursor < chunk.length) {
      const lineEnd = chunk.indexOf('\n', cursor);
      const segmentEnd = lineEnd >= 0 ? lineEnd : chunk.length;
      const segment = chunk.slice(cursor, segmentEnd);
      const segmentBytes = utf8ByteLength(segment);

      if (this.pendingTextBytes + segmentBytes > MAX_SSE_PENDING_LINE_BYTES) {
        throw createChatStreamLimitError();
      }

      this.pendingText += segment;
      this.pendingTextBytes += segmentBytes;

      if (lineEnd < 0) {
        return;
      }

      const rawLine = this.pendingText;
      const rawLineBytes = this.pendingTextBytes + 1;
      this.pendingText = '';
      this.pendingTextBytes = 0;
      this.processLine(
        rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine,
        rawLineBytes,
      );
      cursor = lineEnd + 1;
    }
  }

  finish(): void {
    if (this.pendingText.length > 0) {
      const line = this.pendingText.endsWith('\r')
        ? this.pendingText.slice(0, -1)
        : this.pendingText;
      this.processLine(line, this.pendingTextBytes);
      this.pendingText = '';
      this.pendingTextBytes = 0;
    }

    this.dispatch();
  }

  private processLine(line: string, rawLineBytes: number): void {
    if (line.length === 0) {
      this.dispatch();
      return;
    }

    this.eventBytes += rawLineBytes;
    if (this.eventBytes > MAX_SSE_EVENT_BYTES) {
      throw createChatStreamLimitError();
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
    this.eventBytes = 0;
  }
}
