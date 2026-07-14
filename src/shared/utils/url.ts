const ABSOLUTE_URL_PATTERN = /^[a-z][a-z\d+\-.]*:\/\//i;
const TRUSTED_PAYMENT_HOSTS = ['vnpay.vn', 'vnpayment.vn'] as const;

const parseAbsoluteUrl = (value: string): URL | null => {
  try {
    return new URL(value);
  } catch {
    return null;
  }
};

export const isAbsoluteUrl = (url: string): boolean => ABSOLUTE_URL_PATTERN.test(url);

export const normalizeUrlBase = (url: string): string => url.trim().replace(/\/+$/, '');

export const normalizeApiPath = (path: string): string => {
  const trimmedPath = path.trim();

  if (!trimmedPath || isAbsoluteUrl(trimmedPath)) {
    return trimmedPath;
  }

  return `/${trimmedPath.replace(/^\/+/, '')}`;
};

export const joinUrl = (baseUrl?: string, path?: string): string => {
  if (!baseUrl) {
    return path ? normalizeApiPath(path) : '';
  }

  const normalizedBaseUrl = normalizeUrlBase(baseUrl);

  if (!path) {
    return normalizedBaseUrl;
  }

  const normalizedPath = normalizeApiPath(path);

  if (!normalizedPath || isAbsoluteUrl(normalizedPath)) {
    return normalizedPath || normalizedBaseUrl;
  }

  return `${normalizedBaseUrl}${normalizedPath}`;
};

/**
 * Authenticated clients may only target the configured API base path. This
 * prevents a future absolute-URL call site from forwarding a Bearer token to
 * another origin or to an untrusted path on the same host.
 */
export const isTrustedApiUrl = (candidate: string, apiBaseUrl: string): boolean => {
  if (!isAbsoluteUrl(candidate)) {
    return true;
  }

  const target = parseAbsoluteUrl(candidate);
  const base = parseAbsoluteUrl(normalizeUrlBase(apiBaseUrl));

  if (
    !target
    || !base
    || target.username
    || target.password
    || target.origin !== base.origin
  ) {
    return false;
  }

  const basePath = base.pathname.replace(/\/+$/, '') || '/';
  return basePath === '/'
    || target.pathname === basePath
    || target.pathname.startsWith(`${basePath}/`);
};

/** Only HTTPS redirects owned by VNPay are allowed to leave the app. */
export const isTrustedPaymentRedirectUrl = (candidate: string): boolean => {
  const url = parseAbsoluteUrl(candidate.trim());
  if (!url || url.protocol !== 'https:' || url.username || url.password) {
    return false;
  }

  const hostname = url.hostname.toLowerCase();
  return TRUSTED_PAYMENT_HOSTS.some(
    (trustedHost) => hostname === trustedHost || hostname.endsWith(`.${trustedHost}`),
  );
};
