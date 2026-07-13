import { apiClient } from '@shared/api/axiosInstance';
import { authenticatedFetch } from '@shared/api/authenticatedFetch';
import {
  ApiRequestError,
  unwrapApiResponse,
  type ApiEnvelope,
  type ApiErrorEnvelope,
} from '@shared/api/errors';
import type {
  ChatFeedbackRating,
  ChatFeedbackResponse,
  CreateChatRequest,
  RagChatDoneData,
} from '../types/chatbot';
import { parseRagChatSseEvent, SseParser } from '../utils/sseParser';

interface ChatStreamCallbacks {
  onToken: (content: string) => void;
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

  if (
    typeof payload === 'object'
    && payload !== null
    && 'success' in payload
    && payload.success === false
  ) {
    return unwrapApiResponse<never>(payload as ApiErrorEnvelope);
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
  const parser = new SseParser((wireEvent) => {
    const event = parseRagChatSseEvent(wireEvent);
    if (!event) return;

    if (event.event === 'token') {
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

  try {
    while (!terminalReached) {
      const { value, done } = await reader.read();
      if (done) break;
      parser.feed(decoder.decode(value, { stream: true }));
    }

    if (terminalReached) {
      await reader.cancel().catch(() => undefined);
    } else {
      parser.feed(decoder.decode());
      parser.finish();
    }
  } catch (error) {
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
  const response = await apiClient.post<ApiEnvelope<ChatFeedbackResponse>>(
    `/rag/messages/${assistantMessageId}/feedback`,
    { rating },
  );

  return unwrapApiResponse(response.data);
}
