import axios, { AxiosError } from 'axios';

export interface ApiMeta {
  traceId: string;
  timestamp: string;
}

export interface ApiFieldError {
  field: string;
  message: string;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  fields?: ApiFieldError[] | Record<string, string[] | string>;
}

export interface ApiErrorEnvelope {
  success: false;
  statusCode: number;
  error: ApiErrorPayload;
  meta?: ApiMeta;
}

export interface ApiSuccessEnvelope<T> {
  success: true;
  statusCode: number;
  message?: string | null;
  data: T;
  meta?: ApiMeta;
}

export type ApiEnvelope<T> = ApiSuccessEnvelope<T> | ApiErrorEnvelope;

export class ApiRequestError extends Error {
  readonly code: string;
  readonly statusCode?: number;
  readonly fields: ApiFieldError[];
  readonly traceId?: string;
  readonly isNetworkError: boolean;

  constructor({
    message,
    code,
    statusCode,
    fields = [],
    traceId,
    isNetworkError = false,
  }: {
    message: string;
    code: string;
    statusCode?: number;
    fields?: ApiFieldError[];
    traceId?: string;
    isNetworkError?: boolean;
  }) {
    super(message);
    this.name = 'ApiRequestError';
    this.code = code;
    this.statusCode = statusCode;
    this.fields = fields;
    this.traceId = traceId;
    this.isNetworkError = isNetworkError;
  }
}

const fallbackMessages: Record<string, string> = {
  AUTH_INVALID_CREDENTIALS: 'Email hoặc mật khẩu không đúng.',
  AUTH_EMAIL_NOT_VERIFIED: 'Email chưa được xác minh. Vui lòng kiểm tra mã OTP.',
  AUTH_ACCOUNT_LOCKED: 'Tài khoản đã bị khóa.',
  AUTH_EMAIL_ALREADY_REGISTERED: 'Email đã được đăng ký.',
  AUTH_PHONE_ALREADY_REGISTERED: 'Số điện thoại đã được đăng ký.',
  AUTH_PHONE_INVALID_FORMAT: 'Số điện thoại không đúng định dạng.',
  AUTH_OTP_INVALID: 'Mã xác thực không đúng.',
  AUTH_OTP_EXPIRED: 'Mã xác thực đã hết hạn.',
  AUTH_OTP_RATE_LIMIT_EXCEEDED: 'Bạn đã yêu cầu OTP quá nhiều lần. Vui lòng thử lại sau.',
  AUTH_TOKEN_INVALID: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  VALIDATION_ERROR: 'Thông tin chưa hợp lệ. Vui lòng kiểm tra lại.',
};

const normalizeFields = (
  fields?: ApiErrorPayload['fields'],
): ApiFieldError[] => {
  if (!fields) {
    return [];
  }

  if (Array.isArray(fields)) {
    return fields;
  }

  return Object.entries(fields).flatMap(([field, value]) => {
    if (Array.isArray(value)) {
      return value.map((message) => ({ field, message }));
    }

    return [{ field, message: value }];
  });
};

export const unwrapApiResponse = <T>(envelope: ApiEnvelope<T>): T => {
  if (envelope.success) {
    return envelope.data;
  }

  throw new ApiRequestError({
    message: envelope.error.message,
    code: envelope.error.code,
    statusCode: envelope.statusCode,
    fields: normalizeFields(envelope.error.fields),
    traceId: envelope.meta?.traceId,
  });
};

export const toApiError = (error: unknown): ApiRequestError => {
  if (error instanceof ApiRequestError) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorEnvelope>;
    const envelope = axiosError.response?.data;

    if (envelope?.success === false) {
      const fallbackMessage = fallbackMessages[envelope.error.code];

      return new ApiRequestError({
        message: envelope.error.message || fallbackMessage || 'Yêu cầu không thành công.',
        code: envelope.error.code,
        statusCode: envelope.statusCode,
        fields: normalizeFields(envelope.error.fields),
        traceId: envelope.meta?.traceId,
      });
    }

    if (axiosError.response?.status === 404) {
      return new ApiRequestError({
        message: 'Tính năng này chưa được backend hỗ trợ.',
        code: 'RESOURCE_NOT_FOUND',
        statusCode: 404,
      });
    }

    if (axiosError.code === 'ECONNABORTED') {
      return new ApiRequestError({
        message: 'Kết nối quá thời gian. Vui lòng thử lại.',
        code: 'REQUEST_TIMEOUT',
        isNetworkError: true,
      });
    }

    if (axiosError.message === 'Network Error') {
      return new ApiRequestError({
        message: 'Không thể kết nối tới máy chủ. Vui lòng kiểm tra mạng.',
        code: 'NETWORK_ERROR',
        isNetworkError: true,
      });
    }

    return new ApiRequestError({
      message: 'Yêu cầu không thành công. Vui lòng thử lại.',
      code: 'API_ERROR',
      statusCode: axiosError.response?.status,
    });
  }

  if (error instanceof Error) {
    return new ApiRequestError({
      message: error.message,
      code: 'UNKNOWN_ERROR',
    });
  }

  return new ApiRequestError({
    message: 'Đã có lỗi xảy ra. Vui lòng thử lại.',
    code: 'UNKNOWN_ERROR',
  });
};

export const getApiErrorMessage = (error: unknown): string => toApiError(error).message;
