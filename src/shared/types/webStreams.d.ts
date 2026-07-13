/** Expo installs these web encoding globals on native at runtime. */
declare class TextDecoder {
  constructor(label?: string, options?: { fatal?: boolean; ignoreBOM?: boolean });
  decode(input?: Uint8Array, options?: { stream?: boolean }): string;
}

declare class TextEncoder {
  encode(input?: string): Uint8Array;
}
