import { themes } from './themes';

interface RgbaColor {
  red: number;
  green: number;
  blue: number;
  alpha: number;
}

const parseColor = (color: string): RgbaColor => {
  const hexMatch = /^#([0-9a-f]{6})$/i.exec(color);
  if (hexMatch) {
    const value = hexMatch[1];
    return {
      red: Number.parseInt(value.slice(0, 2), 16),
      green: Number.parseInt(value.slice(2, 4), 16),
      blue: Number.parseInt(value.slice(4, 6), 16),
      alpha: 1,
    };
  }

  const rgbaMatch = /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/i.exec(color);
  if (!rgbaMatch) throw new Error(`Unsupported test color: ${color}`);
  return {
    red: Number(rgbaMatch[1]),
    green: Number(rgbaMatch[2]),
    blue: Number(rgbaMatch[3]),
    alpha: Number(rgbaMatch[4]),
  };
};

const composite = (foreground: RgbaColor, background: RgbaColor): RgbaColor => ({
  red: foreground.red * foreground.alpha + background.red * (1 - foreground.alpha),
  green: foreground.green * foreground.alpha + background.green * (1 - foreground.alpha),
  blue: foreground.blue * foreground.alpha + background.blue * (1 - foreground.alpha),
  alpha: 1,
});

const linearChannel = (channel: number): number => {
  const normalized = channel / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
};

const luminance = (color: RgbaColor): number => (
  0.2126 * linearChannel(color.red)
  + 0.7152 * linearChannel(color.green)
  + 0.0722 * linearChannel(color.blue)
);

const contrastRatio = (foreground: RgbaColor, background: RgbaColor): number => {
  const foregroundLuminance = luminance(foreground);
  const backgroundLuminance = luminance(background);
  return (
    Math.max(foregroundLuminance, backgroundLuminance) + 0.05
  ) / (
    Math.min(foregroundLuminance, backgroundLuminance) + 0.05
  );
};

describe('theme small-text contrast', () => {
  it.each(Object.entries(themes))(
    '%s keeps warning and promotional foregrounds readable',
    (_variant, theme) => {
      const contentSurface = parseColor(theme.effects.contentSurface);
      const warningSurface = composite(
        parseColor(theme.colors.warningLight),
        contentSurface,
      );
      const warningForeground = parseColor(theme.colors.warningForeground);
      const promotionSurface = composite(
        parseColor(theme.accents.promotion.soft),
        contentSurface,
      );

      expect(contrastRatio(warningForeground, warningSurface)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(warningForeground, contentSurface)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(
        parseColor(theme.accents.promotion.foreground),
        promotionSurface,
      )).toBeGreaterThanOrEqual(4.5);
    },
  );
});
