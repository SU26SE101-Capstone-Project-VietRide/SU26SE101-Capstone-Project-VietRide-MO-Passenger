interface CryptoLike {
  randomUUID?: () => string;
  getRandomValues?: (array: Uint8Array) => Uint8Array;
}

let fallbackSequence = 0;

const fallbackUuid = (): string => {
  const cryptoApi = (globalThis as { crypto?: CryptoLike }).crypto;
  if (cryptoApi?.randomUUID) {
    return cryptoApi.randomUUID();
  }

  if (cryptoApi?.getRandomValues) {
    const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
    // Bit masks are required by RFC 4122 to set version and variant bits.
    // eslint-disable-next-line no-bitwise
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    // eslint-disable-next-line no-bitwise
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  // Idempotency keys are identifiers, not secrets. This fallback is only for
  // runtimes without Web Crypto and still preserves the UUID v4 wire contract.
  fallbackSequence = (fallbackSequence + 1) % Number.MAX_SAFE_INTEGER;
  const bytes = new Uint8Array(16);
  let seed = `${Date.now()}-${fallbackSequence}-${Math.random()}`;
  for (let index = 0; index < bytes.length; index += 1) {
    const charCode = seed.charCodeAt(index % seed.length);
    bytes[index] = (charCode + Math.floor(Math.random() * 256)) % 256;
    seed += bytes[index].toString(16);
  }
  // eslint-disable-next-line no-bitwise
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  // eslint-disable-next-line no-bitwise
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

export const IDEMPOTENCY_KEY_UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const createIdempotencyKey = (_scope: string): string => {
  const uuid = fallbackUuid();
  if (!IDEMPOTENCY_KEY_UUID_V4_PATTERN.test(uuid)) {
    throw new Error('Idempotency key generator produced an invalid UUID v4.');
  }

  return uuid;
};

export const normalizeIdempotencyKey = (idempotencyKey: string): string => {
  const normalizedKey = idempotencyKey.trim();
  if (!normalizedKey) {
    throw new Error('Idempotency key is required.');
  }
  if (!IDEMPOTENCY_KEY_UUID_V4_PATTERN.test(normalizedKey)) {
    throw new Error('Idempotency key must be a UUID v4.');
  }

  return normalizedKey;
};

/** Reuses one key for the same logical payload, including manual retries. */
export class IdempotencyKeyTracker {
  private fingerprint: string | null = null;
  private key: string | null = null;

  constructor(private readonly scope: string) {}

  getOrCreate(payload: unknown): string {
    const fingerprint = JSON.stringify(payload);
    if (this.fingerprint !== fingerprint || !this.key) {
      this.fingerprint = fingerprint;
      this.key = createIdempotencyKey(this.scope);
    }

    return this.key;
  }

  reset(): void {
    this.fingerprint = null;
    this.key = null;
  }
}
