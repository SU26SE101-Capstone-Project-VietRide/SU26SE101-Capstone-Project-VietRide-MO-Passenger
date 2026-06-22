const ABSOLUTE_URL_PATTERN = /^[a-z][a-z\d+\-.]*:\/\//i;

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
