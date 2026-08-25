import { resolveCreateParcelContentBottomPadding } from './createParcelLayout';

describe('resolveCreateParcelContentBottomPadding', () => {
  it('uses the measured action-bar height plus a content gap', () => {
    expect(resolveCreateParcelContentBottomPadding({
      measuredActionBarHeight: 148.2,
      bottomInset: 34,
      contentGap: 16,
    })).toBe(165);
  });

  it('keeps the first render clear using the legacy fallback and safe area', () => {
    expect(resolveCreateParcelContentBottomPadding({
      measuredActionBarHeight: 0,
      bottomInset: 34,
      contentGap: 16,
    })).toBe(146);
  });

  it('sanitizes invalid native measurements instead of returning NaN', () => {
    expect(resolveCreateParcelContentBottomPadding({
      measuredActionBarHeight: Number.NaN,
      bottomInset: -10,
      contentGap: 16,
    })).toBe(128);
  });
});
