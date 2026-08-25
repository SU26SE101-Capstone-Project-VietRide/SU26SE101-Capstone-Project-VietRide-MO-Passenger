import { getAppLaunchLayout } from './appLaunchLayout';

describe('getAppLaunchLayout', () => {
  it.each([
    [320, 'compact', 12, 156],
    [360, 'regular', 16, 176],
    [390, 'regular', 16, 176],
    [430, 'large', 20, 184],
  ] as const)(
    'uses the existing responsive width class at %ipx',
    (width, widthClass, horizontalPadding, logoFrameSize) => {
      expect(getAppLaunchLayout({
        width,
        height: 844,
        fontScale: 1,
      })).toMatchObject({
        widthClass,
        horizontalPadding,
        logoFrameSize,
      });
    },
  );

  it('shrinks the brand mark and spacing on a short screen', () => {
    expect(getAppLaunchLayout({
      width: 320,
      height: 480,
      fontScale: 1,
    })).toMatchObject({
      usableHeight: 480,
      logoFrameSize: 120,
      verticalPadding: 8,
      taglineGap: 8,
      progressGap: 6,
      stackProgress: true,
    });
  });

  it('subtracts safe-area insets before resolving height pressure', () => {
    expect(getAppLaunchLayout({
      width: 390,
      height: 667,
      fontScale: 1,
      topInset: 59,
      bottomInset: 34,
    })).toMatchObject({
      usableHeight: 574,
      logoFrameSize: 144,
      verticalPadding: 12,
    });
  });

  it.each([1.4, 2])(
    'stacks progress and reserves copy space at font scale %s',
    (fontScale) => {
      const layout = getAppLaunchLayout({
        width: 430,
        height: 844,
        fontScale,
      });

      expect(layout.stackProgress).toBe(true);
      expect(layout.logoFrameSize).toBeLessThanOrEqual(144);
      expect(layout.verticalPadding).toBe(12);
    },
  );

  it('keeps every computed logo size within its safety bounds', () => {
    const cases = [
      { width: 240, height: 400, fontScale: 2 },
      { width: 320, height: 568, fontScale: 1.4 },
      { width: 390, height: 844, fontScale: 1 },
      { width: 1024, height: 1366, fontScale: 1 },
    ];

    for (const input of cases) {
      const { logoFrameSize } = getAppLaunchLayout(input);
      expect(logoFrameSize).toBeGreaterThanOrEqual(112);
      expect(logoFrameSize).toBeLessThanOrEqual(184);
    }
  });
});
