import {
  getLocalizedApiErrorMessage,
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

  it('normalizes Cloudflare 502 origin failures as retryable gateway errors', () => {
    const error = toApiError({
      isAxiosError: true,
      message: 'Request failed with status code 502',
      response: {
        status: 502,
        data: {
          cloudflare_error: true,
          error_name: 'origin_bad_gateway',
          status: 502,
          retry_after: 60,
        },
      },
    });

    expect(error).toMatchObject({
      code: 'GATEWAY_ORIGIN_UNAVAILABLE',
      statusCode: 502,
      retryAfterSeconds: 60,
    });
  });

  it('keeps backend validation envelopes ahead of gateway fallbacks', () => {
    const error = toApiError({
      isAxiosError: true,
      message: 'Request failed with status code 422',
      response: {
        status: 422,
        data: {
          success: false,
          statusCode: 422,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'A valid UUID v4 Idempotency-Key header is required.',
          },
        },
      },
    });

    expect(error).toMatchObject({
      code: 'VALIDATION_ERROR',
      statusCode: 422,
      message: 'A valid UUID v4 Idempotency-Key header is required.',
    });
  });

  it('maps NestJS VALIDATION_FAILED to the localized validation message', () => {
    const translate = jest.fn((key: string) => key);
    const message = getLocalizedApiErrorMessage(
      {
        isAxiosError: true,
        message: 'Request failed with status code 400',
        response: {
          status: 400,
          data: {
            success: false,
            statusCode: 400,
            error: {
              code: 'VALIDATION_FAILED',
              message: 'Validation failed.',
            },
          },
        },
      },
      translate as never,
    );

    expect(message).toBe('errors.api.validation');
    expect(translate).toHaveBeenCalledWith(
      'errors.api.validation',
      expect.objectContaining({ retryAfter: 60 }),
    );
  });

  it('does not expose arbitrary internal Error messages to the UI', () => {
    const error = toApiError(new Error('ENOENT C:\\private\\credential.txt'));

    expect(error.code).toBe('UNKNOWN_ERROR');
    expect(error.message).not.toContain('credential.txt');
  });
});
