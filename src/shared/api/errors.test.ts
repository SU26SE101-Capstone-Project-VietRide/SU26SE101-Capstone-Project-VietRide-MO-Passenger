import {
  isApiErrorEnvelope,
  parseApiErrorResponse,
  toApiError,
} from './errors';

describe('API error normalization', () => {
  it('parses a valid backend envelope and normalizes field errors', () => {
    const envelope = {
      success: false as const,
      statusCode: 422,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Thông tin chưa hợp lệ.',
        fields: {
          phone: ['Số điện thoại không hợp lệ.'],
        },
      },
      meta: { traceId: 'trace-1', timestamp: '2026-07-13T00:00:00Z' },
    };

    expect(isApiErrorEnvelope(envelope)).toBe(true);
    expect(parseApiErrorResponse(envelope)).toMatchObject({
      code: 'VALIDATION_ERROR',
      statusCode: 422,
      traceId: 'trace-1',
      fields: [{ field: 'phone', message: 'Số điện thoại không hợp lệ.' }],
    });
  });

  it('treats a bare 404 as a missing resource, not an unsupported feature', () => {
    const error = toApiError({
      isAxiosError: true,
      message: 'Request failed with status code 404',
      response: { status: 404 },
    });

    expect(error).toMatchObject({
      code: 'RESOURCE_NOT_FOUND',
      statusCode: 404,
      message: 'Không tìm thấy dữ liệu được yêu cầu.',
    });
  });

  it('does not expose arbitrary internal Error messages to the UI', () => {
    const error = toApiError(new Error('ENOENT C:\\private\\credential.txt'));

    expect(error.code).toBe('UNKNOWN_ERROR');
    expect(error.message).not.toContain('credential.txt');
  });
});
