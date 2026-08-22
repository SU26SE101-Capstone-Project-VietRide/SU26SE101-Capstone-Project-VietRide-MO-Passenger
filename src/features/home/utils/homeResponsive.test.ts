import { getFontScaledListHeight } from './homeResponsive';

describe('getFontScaledListHeight', () => {
  it('keeps the base height at the default font scale', () => {
    expect(getFontScaledListHeight(196, 1)).toBe(196);
  });

  it('grows the viewport at 1.4 font scale so cards are not clipped', () => {
    expect(getFontScaledListHeight(196, 1.4)).toBe(275);
    expect(getFontScaledListHeight(188, 1.4)).toBe(264);
  });

  it('normalizes invalid or reduced font scales', () => {
    expect(getFontScaledListHeight(188, 0.8)).toBe(188);
    expect(getFontScaledListHeight(188, Number.NaN)).toBe(188);
  });
});
