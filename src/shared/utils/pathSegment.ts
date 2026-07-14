const UUID_PATTERN =
  /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;

const MAX_PATH_SEGMENT_LENGTH = 128;

const hasControlCharacter = (value: string): boolean => {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x1f || code === 0x7f) {
      return true;
    }
  }

  return false;
};

/** Checks an RFC 9562 UUID without coercing or normalizing untrusted values. */
export const isUuid = (value: unknown): value is string =>
  typeof value === 'string' && UUID_PATTERN.test(value);

/**
 * Encodes one URL path segment after rejecting ambiguous or unbounded input.
 * This must be used per segment, never on a full path.
 */
export const encodePathSegment = (
  value: unknown,
  fieldName = 'path segment',
): string => {
  if (
    typeof value !== 'string'
    || value.length === 0
    || value.length > MAX_PATH_SEGMENT_LENGTH
    || value !== value.trim()
    || value === '.'
    || value === '..'
    || hasControlCharacter(value)
  ) {
    throw new TypeError(`Invalid ${fieldName}.`);
  }

  try {
    return encodeURIComponent(value);
  } catch {
    // encodeURIComponent rejects malformed UTF-16 (for example a lone surrogate).
    throw new TypeError(`Invalid ${fieldName}.`);
  }
};

/** Validates an entity UUID and returns its URL-safe path representation. */
export const encodeUuidPathSegment = (
  value: unknown,
  fieldName = 'identifier',
): string => {
  if (!isUuid(value)) {
    throw new TypeError(`Invalid ${fieldName}.`);
  }

  return encodePathSegment(value, fieldName);
};
