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
  // runtimes without Web Crypto and combines time, process sequence and RNG.
  fallbackSequence = (fallbackSequence + 1) % Number.MAX_SAFE_INTEGER;
  return `${Date.now().toString(36)}-${fallbackSequence.toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
};

export const createIdempotencyKey = (scope: string): string => {
  const normalizedScope = scope.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 24);
  return `${normalizedScope || 'mobile'}-${fallbackUuid()}`;
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
