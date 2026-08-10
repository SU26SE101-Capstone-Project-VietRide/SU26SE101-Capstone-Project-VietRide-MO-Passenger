/**
 * Development-only API diagnostics.
 *
 * Payloads are sanitized before serialization so authentication material,
 * idempotency keys, PII, addresses, and precise location data never reach the
 * console. Keep this module as the only place that formats HTTP diagnostics.
 */

import type {
  AxiosError,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';

export const API_LOGGER_ENABLED = true;
export const LOG_REQUEST_PAYLOAD = true;
export const LOG_RESPONSE_BODY = true;
/** 0 = no body truncation (full JSON). Positive = max chars after stringify. */
export const API_LOGGER_MAX_BODY_LENGTH = 0;

const REDACTED = '[REDACTED]';
const SEPARATOR = '─'.repeat(60);
const MAX_COLLECTION_ENTRIES = 100;
const MAX_LOG_DEPTH = 8;
/** 0 = no per-string truncation. Positive = max chars per string value. */
const MAX_STRING_LENGTH = 0;

const UUID_PATH_SEGMENT_PATTERN =
  /\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}(?=\/|$)/gi;
const NUMERIC_PATH_SEGMENT_PATTERN = /\/\d+(?=\/|$)/g;
const OPAQUE_PATH_SEGMENT_PATTERN =
  /\/(?:[^/?#]*%40[^/?#]*|[^/?#]*@[^/?#]*)(?=\/|$)/gi;

const SENSITIVE_KEYS = new Set([
  'authorization',
  'proxyauthorization',
  'token',
  // 'accesstoken',
  // 'refreshtoken',
  'idtoken',
  'devicetoken',
  'password',
  'currentpassword',
  'newpassword',
  'confirmpassword',
  'passcode',
  'pin',
  'secret',
  'clientsecret',
  'privatekey',
  'credential',
  'credentials',
  'apikey',
  'xapikey',
  'cookie',
  'setcookie',
  'session',
  'sessionid',
  'shareurl',
  'idempotencykey',
  'contact',
  'contactinfo',
  'contactinformation',
  'contactname',
  'phone',
  'phonenumber',
  'email',
  'emailaddress',
  'fullname',
  'firstname',
  'lastname',
  'passengername',
  'recipientname',
  'sendername',
  'idnumber',
  'nationalid',
  'identitynumber',
  'identitycard',
  'passport',
  'passportnumber',
  'dateofbirth',
  'birthdate',
  'userid',
  'passengerid',
  'customerid',
  'accountid',
  'address',
  'pickupaddress',
  'dropoffaddress',
  'shuttleaddress',
  'latitude',
  'longitude',
  'lat',
  'lng',
  'coordinate',
  'coordinates',
  'location',
]);

const normalizeKey = (key: string): string =>
  key.toLowerCase().replace(/[^a-z0-9]/g, '');

const isSensitiveKey = (key: string): boolean => {
  const normalized = normalizeKey(key);

  return (
    SENSITIVE_KEYS.has(normalized) ||
    normalized.endsWith('token') ||
    normalized.endsWith('password') ||
    normalized.endsWith('secret') ||
    normalized.endsWith('cookie') ||
    normalized.endsWith('address') ||
    normalized.endsWith('phone') ||
    normalized.endsWith('email') ||
    normalized.endsWith('contact') ||
    normalized.endsWith('latitude') ||
    normalized.endsWith('longitude') ||
    normalized.endsWith('coordinates')
  );
};

/** Calendar date or RFC 3339 instant — must not be treated as a phone number. */
const isApiDateOrInstant = (value: string): boolean => (
  /^\d{4}-\d{2}-\d{2}$/.test(value)
  || /^\d{4}-\d{2}-\d{2}T/.test(value)
  || /^\d{2}:\d{2}(:\d{2})?$/.test(value)
);

const sanitizeText = (text: string): string => {
  const maybeTruncated =
    MAX_STRING_LENGTH > 0 && text.length > MAX_STRING_LENGTH
      ? `${text.slice(0, MAX_STRING_LENGTH)}… [string truncated]`
      : text;

  // Pure date/instant strings (departureDate, recordedAt, …) skip phone scrubbing.
  if (isApiDateOrInstant(maybeTruncated.trim())) {
    return maybeTruncated;
  }

  return maybeTruncated
    .replace(/Bearer\s+[^\s,;]+/gi, `Bearer ${REDACTED}`)
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, REDACTED)
    .replace(/(https?:\/\/[^\s"'<>#]+)#token=[^\s"'<>]+/gi, '$1#[REDACTED_FRAGMENT]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, REDACTED)
    .replace(/(?:https?:\/\/|\/)[^\s"'<>?]+\?[^\s"'<>]+/gi, match => {
      const queryIndex = match.indexOf('?');
      return `${match.slice(0, queryIndex)}?[REDACTED_QUERY]`;
    })
    // Phones: require optional + and at least 9 digit-like chars; exclude ISO dates.
    .replace(
      /(^|[^\w])(\+?\d[\d\s().-]{8,}\d)(?=$|[^\w])/g,
      (full, prefix: string, candidate: string) => {
        const compact = candidate.replace(/[\s().-]/g, '');
        if (/^\d{4}-\d{2}-\d{2}/.test(candidate.trim())) return full;
        // VN mobiles are typically 10–11 digits; skip short calendar-like runs.
        if (compact.length < 9 || compact.length > 15) return full;
        return `${prefix}${REDACTED}`;
      },
    );
};

const sanitizeValue = (
  value: unknown,
  seen: WeakSet<object>,
  depth: number,
): unknown => {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return sanitizeText(value);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'bigint')
    return `[bigint:${value.toString().length} digits]`;
  if (typeof value === 'function' || typeof value === 'symbol') {
    return `[${typeof value} omitted]`;
  }

  if (depth >= MAX_LOG_DEPTH) return '[maximum log depth reached]';
  if (typeof value !== 'object') return '[unsupported value omitted]';
  if (seen.has(value)) return '[circular reference]';
  seen.add(value);

  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? '[invalid date]'
      : value.toISOString();
  }

  if (Array.isArray(value)) {
    const sanitized = value
      .slice(0, MAX_COLLECTION_ENTRIES)
      .map(item => sanitizeValue(item, seen, depth + 1));
    if (value.length > MAX_COLLECTION_ENTRIES) {
      sanitized.push(
        `[${value.length - MAX_COLLECTION_ENTRIES} items omitted]`,
      );
    }
    return sanitized;
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    const typeName = value.constructor?.name ?? 'non-plain object';
    return `[${typeName} omitted]`;
  }

  const entries = Object.entries(value).slice(0, MAX_COLLECTION_ENTRIES);
  const sanitized: Record<string, unknown> = {};

  for (const [key, nestedValue] of entries) {
    sanitized[key] = isSensitiveKey(key)
      ? REDACTED
      : sanitizeValue(nestedValue, seen, depth + 1);
  }

  const entryCount = Object.keys(value).length;
  if (entryCount > MAX_COLLECTION_ENTRIES) {
    sanitized.__logTruncated = `${
      entryCount - MAX_COLLECTION_ENTRIES
    } fields omitted`;
  }

  return sanitized;
};

const sanitizeForLog = (value: unknown): unknown =>
  sanitizeValue(value, new WeakSet<object>(), 0);

const truncate = (text: string, max: number): string => {
  if (max <= 0 || text.length <= max) return text;
  return `${text.slice(0, max)}\n  … [truncated ${text.length - max} chars]`;
};

const safeStringify = (value: unknown): string => {
  try {
    return JSON.stringify(sanitizeForLog(value), null, 2);
  } catch {
    return '[unserializable log payload omitted]';
  }
};

const formatBody = (body: unknown): string | null => {
  if (body === undefined || body === null || body === '') return null;

  if (typeof body === 'string') {
    try {
      return truncate(
        safeStringify(JSON.parse(body)),
        API_LOGGER_MAX_BODY_LENGTH,
      );
    } catch {
      return `[non-JSON string body omitted; ${body.length} characters]`;
    }
  }

  return truncate(safeStringify(body), API_LOGGER_MAX_BODY_LENGTH);
};

const formatParams = (params: unknown): string | null => {
  if (!params) return null;
  try {
    if (typeof params === 'object' && Object.keys(params).length === 0)
      return null;
  } catch {
    return '[query parameters omitted]';
  }
  return truncate(safeStringify(params), API_LOGGER_MAX_BODY_LENGTH);
};

const safeRouteLabel = (url?: string): string => {
  if (!url) return '/';

  let path = url.split(/[?#]/, 1)[0];
  if (/^https?:\/\//i.test(url)) {
    try {
      path = new URL(url).pathname;
    } catch {
      return '[invalid-url]';
    }
  }

  return path
    .replace(UUID_PATH_SEGMENT_PATTERN, '/:id')
    .replace(NUMERIC_PATH_SEGMENT_PATTERN, '/:id')
    .replace(OPAQUE_PATH_SEGMENT_PATTERN, '/:value');
};

const hasHeader = (
  headers: InternalAxiosRequestConfig['headers'] | undefined,
  name: string,
): boolean => {
  if (!headers) return false;

  try {
    const headerGetter = (headers as { get?: (headerName: string) => unknown })
      .get;
    if (typeof headerGetter === 'function') {
      return Boolean(headerGetter.call(headers, name));
    }

    const normalizedName = normalizeKey(name);
    return Object.entries(headers).some(
      ([headerName, value]) =>
        normalizeKey(headerName) === normalizedName && Boolean(value),
    );
  } catch {
    return false;
  }
};

const safeErrorMessage = (message: string): string => {
  if (message === 'Network Error') return message;
  if (/^Request failed with status code \d{3}$/.test(message)) return message;
  if (/^timeout of \d+ms exceeded$/i.test(message)) return message;

  return `[custom error message omitted; ${message.length} characters]`;
};

export const logRequest = (config: InternalAxiosRequestConfig): void => {
  if (!__DEV__ || !API_LOGGER_ENABLED) return;

  const method = config.method?.toUpperCase() ?? 'GET';
  const url = safeRouteLabel(config.url);
  const requestId = config._requestId ?? '???';
  const parts: string[] = [
    `\n${SEPARATOR}`,
    `📤 REQUEST [${requestId}]  ${method}  ${url}`,
    SEPARATOR,
  ];

  if (hasHeader(config.headers, 'Authorization')) {
    parts.push(`🔑 Auth: ${REDACTED}`);
  }
  if (hasHeader(config.headers, 'Idempotency-Key')) {
    parts.push(`🔄 Idempotency-Key: ${REDACTED}`);
  }

  if (LOG_REQUEST_PAYLOAD) {
    const params = formatParams(config.params);
    if (params) parts.push(`📋 Query Params:\n${params}`);

    const body = formatBody(config.data);
    if (body) parts.push(`📦 Request Body:\n${body}`);
  }

  const searchSummary = formatTripSearchRequestSummary(config);
  if (searchSummary) {
    parts.push(searchSummary);
    // Emit early as info — Metro paste often drops multiline debug blocks.
    console.info(searchSummary);
  }

  parts.push(SEPARATOR);
  console.debug(parts.join('\n'));
};

export const logResponse = (response: AxiosResponse): void => {
  if (!__DEV__ || !API_LOGGER_ENABLED) return;

  const method = response.config.method?.toUpperCase() ?? 'GET';
  const url = safeRouteLabel(response.config.url);
  const requestId = response.config._requestId ?? '???';
  const elapsed = response.config._requestStartedAt
    ? `${Math.max(0, Date.now() - response.config._requestStartedAt)}ms`
    : '?ms';
  const statusEmoji =
    response.status >= 200 && response.status < 300 ? '✅' : '⚠️';

  // Emit trip-search summary FIRST as console.info — Metro/copy often drops
  // long multiline console.debug payloads after the "Response Body:" label.
  const searchSummary = formatTripSearchResponseSummary(
    response.config,
    response.status,
    response.data,
  );
  if (searchSummary) {
    console.info(searchSummary);
  }

  const parts: string[] = [
    `\n${SEPARATOR}`,
    `${statusEmoji} RESPONSE [${requestId}]  ${response.status}  ${method}  ${url}  (${elapsed})`,
    SEPARATOR,
  ];

  if (LOG_RESPONSE_BODY) {
    const body = formatBody(response.data);
    if (body) {
      parts.push(`📥 Response Body:\n${body}`);
    } else {
      parts.push(
        `📥 Response Body: (empty or unreadable; typeof=${typeof response.data})`,
      );
    }
  }

  if (searchSummary) parts.push(searchSummary);

  parts.push(SEPARATOR);
  console.debug(parts.join('\n'));
};

/** Compact trip-search lines so Metro paste still shows the outcome. */
const isTripSearchRequest = (config: InternalAxiosRequestConfig | undefined): boolean => {
  const raw = `${config?.url ?? ''} ${config?.baseURL ?? ''}`;
  const path = safeRouteLabel(config?.url);
  return path.includes('trips/search') || /trips\/search/i.test(raw);
};

const readParam = (
  params: unknown,
  key: string,
): string | number | boolean | undefined => {
  if (!params || typeof params !== 'object') return undefined;
  const value = (params as Record<string, unknown>)[key];
  if (
    typeof value === 'string'
    || typeof value === 'number'
    || typeof value === 'boolean'
  ) {
    return value;
  }
  return undefined;
};

const formatTripSearchRequestSummary = (
  config: InternalAxiosRequestConfig,
): string | null => {
  if (!isTripSearchRequest(config)) return null;
  const p = config.params;
  const fields = [
    ['originStationId', readParam(p, 'originStationId')],
    ['destinationStationId', readParam(p, 'destinationStationId')],
    ['originProvinceCode', readParam(p, 'originProvinceCode')],
    ['originWardCode', readParam(p, 'originWardCode')],
    ['destinationProvinceCode', readParam(p, 'destinationProvinceCode')],
    ['destinationWardCode', readParam(p, 'destinationWardCode')],
    ['departureDate', readParam(p, 'departureDate')],
    ['passengerCount', readParam(p, 'passengerCount')],
    ['allowAlongRoutePickup', readParam(p, 'allowAlongRoutePickup')],
  ]
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(' ');

  return `🔎 TRIP_SEARCH_REQ ${fields || '(no recognized params)'}`;
};

const unwrapSearchPayload = (data: unknown): {
  totalItems?: number;
  items?: Array<{
    tripId?: string;
    departureDateTime?: string;
    originStation?: { name?: string };
    destinationStation?: { name?: string };
  }>;
} | null => {
  if (!data || typeof data !== 'object') return null;
  const root = data as Record<string, unknown>;
  // Envelope: { success, data: { items, totalItems } }
  if (root.data && typeof root.data === 'object' && !Array.isArray(root.data)) {
    const inner = root.data as Record<string, unknown>;
    if ('items' in inner || 'totalItems' in inner) {
      return inner as {
        totalItems?: number;
        items?: Array<{
          tripId?: string;
          departureDateTime?: string;
          originStation?: { name?: string };
          destinationStation?: { name?: string };
        }>;
      };
    }
  }
  // Already unwrapped page object
  if ('items' in root || 'totalItems' in root) {
    return root as {
      totalItems?: number;
      items?: Array<{
        tripId?: string;
        departureDateTime?: string;
        originStation?: { name?: string };
        destinationStation?: { name?: string };
      }>;
    };
  }
  return null;
};

const formatTripSearchResponseSummary = (
  config: InternalAxiosRequestConfig | undefined,
  status: number,
  data: unknown,
): string | null => {
  if (!isTripSearchRequest(config)) return null;

  let totalItems: number | string = '?';
  let itemCount: number | string = '?';
  let firstTripId = '-';
  let firstDep = '-';
  let routeLabel = '-';

  try {
    const payload = unwrapSearchPayload(data);
    if (payload) {
      totalItems = typeof payload.totalItems === 'number' ? payload.totalItems : '?';
      itemCount = Array.isArray(payload.items) ? payload.items.length : '?';
      const first = Array.isArray(payload.items) ? payload.items[0] : undefined;
      if (first) {
        firstTripId = first.tripId ?? '-';
        firstDep = first.departureDateTime ?? '-';
        const from = first.originStation?.name ?? '?';
        const to = first.destinationStation?.name ?? '?';
        routeLabel = `${from} -> ${to}`;
      }
    } else {
      totalItems = 'UNPARSED';
      itemCount = typeof data;
    }
  } catch {
    totalItems = 'ERROR';
  }

  return (
    `🔎 TRIP_SEARCH_RES status=${status} totalItems=${totalItems} `
    + `items=${itemCount} firstTripId=${firstTripId} firstDep=${firstDep} route=${routeLabel}`
  );
};

export const logError = (error: AxiosError): void => {
  if (!__DEV__ || !API_LOGGER_ENABLED) return;

  const config = error.config;
  const method = config?.method?.toUpperCase() ?? 'REQUEST';
  const url = safeRouteLabel(config?.url);
  const requestId = config?._requestId ?? '???';
  const status = error.response?.status ?? error.code ?? 'NETWORK_ERROR';
  const elapsed = config?._requestStartedAt
    ? `${Math.max(0, Date.now() - config._requestStartedAt)}ms`
    : '?ms';
  const parts: string[] = [
    `\n${SEPARATOR}`,
    `❌ ERROR [${requestId}]  ${status}  ${method}  ${url}  (${elapsed})`,
    SEPARATOR,
    `💬 Message: ${safeErrorMessage(error.message)}`,
  ];

  if (hasHeader(config?.headers, 'Authorization')) {
    parts.push(`🔑 Auth: ${REDACTED}`);
  }
  if (hasHeader(config?.headers, 'Idempotency-Key')) {
    parts.push(`🔄 Idempotency-Key: ${REDACTED}`);
  }

  if (error.response?.data) {
    const body = formatBody(error.response.data);
    if (body) parts.push(`📥 Error Response Body:\n${body}`);
  }

  if (LOG_REQUEST_PAYLOAD && config?.data) {
    const requestBody = formatBody(config.data);
    if (requestBody) parts.push(`📤 Original Request Body:\n${requestBody}`);
  }

  parts.push(SEPARATOR);
  console.warn(parts.join('\n'));
};
