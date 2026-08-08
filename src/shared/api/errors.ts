import axios, { AxiosError } from 'axios';
import type { TFunction } from 'i18next';

export interface ApiMeta {
  traceId: string;
  timestamp: string;
}

export interface ApiFieldError {
  field: string;
  message: string;
  /**
   * Optional multi-value payload (e.g. seat labels in `value: string[]`).
   * Mirrors BE ExtractSeatNumbers which reads both message and value.
   */
  values?: string[];
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  fields?: ApiFieldError[] | Record<string, string[] | string> | Array<Record<string, unknown>>;
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
  readonly retryAfterSeconds?: number;

  constructor({
    message,
    code,
    statusCode,
    fields = [],
    traceId,
    isNetworkError = false,
    retryAfterSeconds,
  }: {
    message: string;
    code: string;
    statusCode?: number;
    fields?: ApiFieldError[];
    traceId?: string;
    isNetworkError?: boolean;
    retryAfterSeconds?: number;
  }) {
    super(message);
    this.name = 'ApiRequestError';
    this.code = code;
    this.statusCode = statusCode;
    this.fields = fields;
    this.traceId = traceId;
    this.isNetworkError = isNetworkError;
    this.retryAfterSeconds = retryAfterSeconds;
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
  AUTH_PASSWORD_RESET_TOKEN_INVALID: 'Phiên đặt lại mật khẩu không hợp lệ. Vui lòng yêu cầu mã mới.',
  AUTH_PASSWORD_RESET_TOKEN_EXPIRED: 'Phiên đặt lại mật khẩu đã hết hạn. Vui lòng yêu cầu mã mới.',
  AUTH_TOKEN_INVALID: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  VALIDATION_ERROR: 'Thông tin chưa hợp lệ. Vui lòng kiểm tra lại.',
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const isApiErrorEnvelope = (value: unknown): value is ApiErrorEnvelope => {
  if (!isRecord(value) || value.success !== false || !isRecord(value.error)) {
    return false;
  }

  return (
    typeof value.statusCode === 'number'
    && typeof value.error.code === 'string'
    && typeof value.error.message === 'string'
  );
};

const isSeatNumbersField = (field: string): boolean => {
  const normalized = field.trim().toLowerCase();
  return normalized === 'seatnumbers'
    || normalized === 'outbound.seatnumbers'
    || normalized === 'return.seatnumbers';
};

/** Collect seat-like labels from message and/or value[] (BE ExtractSeatNumbers parity). */
const collectFieldValueLabels = (fieldError: Record<string, unknown>): string[] => {
  const labels: string[] = [];
  const seen = new Set<string>();
  const pushToken = (raw: string): void => {
    for (const part of raw.split(/[,;\s]+/)) {
      const token = part.trim();
      if (!token || seen.has(token)) continue;
      seen.add(token);
      labels.push(token);
    }
  };

  if (typeof fieldError.message === 'string' && fieldError.message.trim()) {
    pushToken(fieldError.message);
  }

  const value = fieldError.value;
  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === 'string' && item.trim()) pushToken(item);
    }
  } else if (typeof value === 'string' && value.trim()) {
    pushToken(value);
  }

  return labels;
};

export const normalizeApiFields = (
  fields?: ApiErrorPayload['fields'],
): ApiFieldError[] => {
  if (!fields) {
    return [];
  }

  if (Array.isArray(fields)) {
    return fields.flatMap((fieldError) => {
      if (!isRecord(fieldError) || typeof fieldError.field !== 'string') {
        return [];
      }

      const field = fieldError.field;
      const messageText = typeof fieldError.message === 'string'
        ? fieldError.message
        : '';
      const labels = collectFieldValueLabels(fieldError);

      // Classic { field, message } validation errors.
      if (messageText && !isSeatNumbersField(field) && !Array.isArray(fieldError.value)) {
        return [{ field, message: messageText }];
      }

      // Seat conflicts: keep field when message and/or value[] present.
      if (isSeatNumbersField(field) || Array.isArray(fieldError.value)) {
        if (!messageText && labels.length === 0) return [];
        return [{
          field,
          message: messageText || labels.join(', '),
          ...(labels.length > 0 ? { values: labels } : {}),
        }];
      }

      if (!messageText) return [];
      return [{ field, message: messageText }];
    });
  }

  return Object.entries(fields).flatMap(([field, value]) => {
    if (Array.isArray(value)) {
      const labels = value.filter((item): item is string => typeof item === 'string');
      if (labels.length === 0) return [];
      return [{
        field,
        message: labels.join(', '),
        ...(isSeatNumbersField(field) ? { values: labels } : {}),
      }];
    }

    return typeof value === 'string' ? [{ field, message: value }] : [];
  });
};

export const apiErrorFromEnvelope = (
  envelope: ApiErrorEnvelope,
): ApiRequestError => {
  const fallbackMessage = fallbackMessages[envelope.error.code];

  return new ApiRequestError({
    message: envelope.error.message || fallbackMessage || 'Yêu cầu không thành công.',
    code: envelope.error.code,
    statusCode: envelope.statusCode,
    fields: normalizeApiFields(envelope.error.fields),
    traceId: envelope.meta?.traceId,
  });
};

export const parseApiErrorResponse = (value: unknown): ApiRequestError | null =>
  isApiErrorEnvelope(value) ? apiErrorFromEnvelope(value) : null;

const isCloudflareGatewayError = (
  value: unknown,
): value is {
  cloudflare_error: true;
  status?: number;
  retry_after?: number;
  error_name?: string;
} =>
  isRecord(value)
  && value.cloudflare_error === true
  && (
    value.error_name === 'origin_bad_gateway'
    || value.error_category === 'origin'
    || value.status === 502
  );

export const unwrapApiResponse = <T>(envelope: ApiEnvelope<T>): T => {
  if (envelope.success) {
    return envelope.data;
  }

  throw new ApiRequestError({
    message: envelope.error.message,
    code: envelope.error.code,
    statusCode: envelope.statusCode,
    fields: normalizeApiFields(envelope.error.fields),
    traceId: envelope.meta?.traceId,
  });
};

export const toApiError = (error: unknown): ApiRequestError => {
  if (error instanceof ApiRequestError) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<unknown>;
    const envelope = axiosError.response?.data;

    if (isApiErrorEnvelope(envelope)) {
      return apiErrorFromEnvelope(envelope);
    }

    if (isCloudflareGatewayError(envelope)) {
      return new ApiRequestError({
        message: 'Máy chủ thanh toán/đặt vé đang bận. Vui lòng chờ khoảng 1 phút rồi thử lại.',
        code: 'GATEWAY_ORIGIN_UNAVAILABLE',
        statusCode: axiosError.response?.status ?? envelope.status,
        retryAfterSeconds: typeof envelope.retry_after === 'number'
          ? envelope.retry_after
          : undefined,
      });
    }

    if (axiosError.response?.status === 404) {
      return new ApiRequestError({
        message: 'Không tìm thấy dữ liệu được yêu cầu.',
        code: 'RESOURCE_NOT_FOUND',
        statusCode: 404,
      });
    }

    if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT') {
      return new ApiRequestError({
        message: 'Kết nối quá thời gian. Vui lòng thử lại.',
        code: 'REQUEST_TIMEOUT',
        isNetworkError: true,
      });
    }

    if (axiosError.code === 'ERR_NETWORK' || axiosError.message === 'Network Error') {
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
      message: 'Đã có lỗi xảy ra. Vui lòng thử lại.',
      code: 'UNKNOWN_ERROR',
    });
  }

  return new ApiRequestError({
    message: 'Đã có lỗi xảy ra. Vui lòng thử lại.',
    code: 'UNKNOWN_ERROR',
  });
};

const DEFAULT_ERROR_TRANSLATION_KEYS: Readonly<Record<string, string>> = {
  AUTH_INVALID_CREDENTIALS: 'errors.api.invalidCredentials',
  AUTH_EMAIL_NOT_VERIFIED: 'errors.api.emailNotVerified',
  AUTH_ACCOUNT_LOCKED: 'errors.api.accountLocked',
  AUTH_EMAIL_ALREADY_REGISTERED: 'errors.api.emailAlreadyRegistered',
  AUTH_PHONE_ALREADY_REGISTERED: 'errors.api.phoneAlreadyRegistered',
  AUTH_PHONE_INVALID_FORMAT: 'errors.api.phoneInvalid',
  AUTH_OTP_INVALID: 'errors.api.otpInvalid',
  AUTH_OTP_EXPIRED: 'errors.api.otpExpired',
  AUTH_OTP_RATE_LIMIT_EXCEEDED: 'errors.api.otpRateLimit',
  AUTH_PASSWORD_RESET_TOKEN_INVALID: 'errors.api.passwordResetInvalid',
  AUTH_PASSWORD_RESET_TOKEN_EXPIRED: 'errors.api.passwordResetExpired',
  AUTH_TOKEN_INVALID: 'errors.api.sessionExpired',
  VALIDATION_ERROR: 'errors.api.validation',
  GATEWAY_ORIGIN_UNAVAILABLE: 'errors.api.gatewayUnavailable',
  RESOURCE_NOT_FOUND: 'errors.api.notFound',
  REQUEST_TIMEOUT: 'errors.api.timeout',
  NETWORK_ERROR: 'errors.api.network',
  API_ERROR: 'errors.api.requestFailed',
  UNKNOWN_ERROR: 'errors.api.unknown',
};

const getStatusTranslationKey = (error: ApiRequestError): string => {
  if (error.isNetworkError) return 'errors.api.network';
  if (error.statusCode === 401) return 'errors.api.sessionExpired';
  if (error.statusCode === 403) return 'errors.api.forbidden';
  if (error.statusCode === 404) return 'errors.api.notFound';
  if (error.statusCode === 409) return 'errors.api.conflict';
  if (error.statusCode === 422) return 'errors.api.validation';
  if (error.statusCode === 429) return 'errors.api.rateLimit';
  if (error.statusCode && error.statusCode >= 500) {
    return 'errors.api.serverUnavailable';
  }
  return 'errors.api.unknown';
};

/**
 * Converts transport/backend errors into app-owned copy. Feature code maps may
 * override specific business codes while network/auth/status fallbacks remain
 * centralized and safe for every locale.
 */
export const getLocalizedApiErrorMessage = (
  error: unknown,
  t: TFunction,
  featureCodeKeys: Readonly<Record<string, string>> = {},
): string => {
  const apiError = toApiError(error);
  const translationKey = featureCodeKeys[apiError.code]
    ?? DEFAULT_ERROR_TRANSLATION_KEYS[apiError.code]
    ?? getStatusTranslationKey(apiError);

  return t(translationKey, {
    retryAfter: apiError.retryAfterSeconds ?? 60,
  });
};
