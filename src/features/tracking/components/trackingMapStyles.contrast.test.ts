import fs from 'node:fs';
import path from 'node:path';

import {
  TRACKING_MAP_DARK_PALETTE,
  TRACKING_MAP_LIGHT_PALETTE,
} from './trackingMapStyles';

const luminance = (hexColor: string): number => {
  const channels = [1, 3, 5].map((start) => (
    Number.parseInt(hexColor.slice(start, start + 2), 16) / 255
  ));
  const [red, green, blue] = channels.map((channel) => (
    channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4
  ));
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
};

const contrastRatio = (foreground: string, background: string): number => {
  const foregroundLuminance = luminance(foreground);
  const backgroundLuminance = luminance(background);
  return (
    Math.max(foregroundLuminance, backgroundLuminance) + 0.05
  ) / (
    Math.min(foregroundLuminance, backgroundLuminance) + 0.05
  );
};

describe('tracking amber marker contrast', () => {
  it.each([
    ['light', TRACKING_MAP_LIGHT_PALETTE],
    ['dark', TRACKING_MAP_DARK_PALETTE],
  ] as const)('keeps the %s next-stop glyph readable', (_variant, palette) => {
    expect(contrastRatio(palette.nextGlyph, palette.next)).toBeGreaterThanOrEqual(4.5);
  });

  it('uses the palette-owned next-stop glyph in the sheet', () => {
    const source = fs.readFileSync(
      path.join(__dirname, 'UpcomingStopsSheet.tsx'),
      'utf8',
    );
    expect(source).toContain('color: palette.nextGlyph');
    expect(source).not.toContain("color: '#241A06'");
  });
});
