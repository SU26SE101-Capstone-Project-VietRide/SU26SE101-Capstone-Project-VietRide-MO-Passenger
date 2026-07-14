import { ApiRequestError } from '@shared/api/errors';

export const createChatStreamLimitError = (): ApiRequestError =>
  new ApiRequestError({
    message: 'Phản hồi từ trợ lý vượt quá giới hạn an toàn.',
    code: 'RAG_STREAM_LIMIT_EXCEEDED',
  });
