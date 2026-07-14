import { apiClient } from '@shared/api/axiosInstance';
import { authenticatedFetch } from '@shared/api/authenticatedFetch';
import {
  ApiRequestError,
  parseApiErrorResponse,
  unwrapApiResponse,
  type ApiEnvelope,
} from '@shared/api/errors';
import { encodeUuidPathSegment } from '@shared/utils/pathSegment';
import {
  MAX_ASSISTANT_CHARACTERS,
  MAX_SSE_STREAM_BYTES,
} from '../constants/chatLimits';
import type {
  ChatFeedbackRating,
  ChatFeedbackResponse,
  CreateChatRequest,
  RagChatDoneData,
} from '../types/chatbot';
import { createChatStreamLimitError } from '../utils/chatStreamError';
import { parseRagChatSseEvent, SseParser } from '../utils/sseParser';

interface ChatStreamCallbacks {
  onToken: (content: string) => void;
  onActivity?: () => void;
}

const isAbortError = (error: unknown): boolean =>
  error instanceof Error && /abort/i.test(`${error.name} ${error.message}`);

const throwHttpError = async (response: Response): Promise<never> => {
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ApiRequestError({
      message: `Yêu cầu trợ lý thất bại (HTTP ${response.status}).`,
      code: 'RAG_HTTP_ERROR',
      statusCode: response.status,
    });
  }

  const apiError = parseApiErrorResponse(payload);
  if (apiError) {
    throw apiError;
  }

  throw new ApiRequestError({
    message: `Yêu cầu trợ lý thất bại (HTTP ${response.status}).`,
    code: 'RAG_HTTP_ERROR',
    statusCode: response.status,
  });
};

export async function streamChat(
  request: CreateChatRequest,
  callbacks: ChatStreamCallbacks,
  signal: AbortSignal,
): Promise<RagChatDoneData> {
  let response: Awaited<ReturnType<typeof authenticatedFetch>>;

  try {
    response = await authenticatedFetch('/rag/chat', {
      method: 'POST',
      body: JSON.stringify(request),
      signal,
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    throw new ApiRequestError({
      message: 'Không thể kết nối tới trợ lý VietRide.',
      code: 'NETWORK_ERROR',
      isNetworkError: true,
    });
  }

  if (!response.ok) {
    return throwHttpError(response as unknown as Response);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('text/event-stream')) {
    throw new ApiRequestError({
      message: 'Máy chủ không trả về luồng hội thoại hợp lệ.',
      code: 'RAG_STREAM_INVALID',
    });
  }

  if (!response.body) {
    throw new ApiRequestError({
      message: 'Thiết bị không thể đọc luồng hội thoại.',
      code: 'RAG_STREAM_UNAVAILABLE',
    });
  }

  let doneData: RagChatDoneData | null = null;
  let terminalError: ApiRequestError | null = null;
  let terminalReached = false;
  let assistantCharacters = 0;
  const parser = new SseParser((wireEvent) => {
    const event = parseRagChatSseEvent(wireEvent);
    if (!event) return;

    if (event.event === 'token') {
      assistantCharacters += event.data.content.length;
      if (assistantCharacters > MAX_ASSISTANT_CHARACTERS) {
        throw createChatStreamLimitError();
      }
      callbacks.onToken(event.data.content);
    } else if (event.event === 'done') {
      doneData = event.data;
      terminalReached = true;
    } else {
      terminalError = new ApiRequestError({
        message: event.data.message,
        code: event.data.code,
      });
      terminalReached = true;
    }
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let streamBytes = 0;

  try {
    while (!terminalReached) {
      const { value, done } = await reader.read();
      if (done) break;
      if (!value || value.byteLength === 0) continue;

      streamBytes += value.byteLength;
      if (streamBytes > MAX_SSE_STREAM_BYTES) {
        throw createChatStreamLimitError();
      }

      callbacks.onActivity?.();
      parser.feed(decoder.decode(value, { stream: true }));
    }

    if (terminalReached) {
      await reader.cancel().catch(() => undefined);
    } else {
      parser.feed(decoder.decode());
      parser.finish();
    }
  } catch (error) {
    await reader.cancel().catch(() => undefined);

    if (isAbortError(error) || error instanceof ApiRequestError) {
      throw error;
    }

    throw new ApiRequestError({
      message: 'Kết nối với trợ lý đã bị gián đoạn.',
      code: 'RAG_STREAM_INTERRUPTED',
      isNetworkError: true,
    });
  } finally {
    reader.releaseLock();
  }

  if (terminalError) {
    throw terminalError;
  }

  if (!doneData) {
    throw new ApiRequestError({
      message: 'Phản hồi từ trợ lý chưa hoàn tất.',
      code: 'RAG_STREAM_INTERRUPTED',
      isNetworkError: true,
    });
  }

  return doneData;
}

export async function submitChatFeedback(
  assistantMessageId: string,
  rating: ChatFeedbackRating,
): Promise<ChatFeedbackResponse> {
  const safeMessageId = encodeUuidPathSegment(
    assistantMessageId,
    'assistant message ID',
  );
  const response = await apiClient.post<ApiEnvelope<ChatFeedbackResponse>>(
    `/rag/messages/${safeMessageId}/feedback`,
    { rating },
  );

  return unwrapApiResponse(response.data);
}
