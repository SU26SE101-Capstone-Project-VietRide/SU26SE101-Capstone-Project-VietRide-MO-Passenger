import { getWidthClass, type WidthClass } from './responsive';

const MIN_LOGO_FRAME_SIZE = 112;
const MAX_LOGO_FRAME_SIZE = 184;

interface AppLaunchLayoutInput {
  width: number;
  height: number;
  fontScale: number;
  topInset?: number;
  bottomInset?: number;
}

export interface AppLaunchLayout {
  widthClass: WidthClass;
  usableHeight: number;
  horizontalPadding: number;
  verticalPadding: number;
  contentMaxWidth: number;
  logoFrameSize: number;
  taglineGap: number;
  progressGap: number;
  stackProgress: boolean;
}

const finiteNonNegative = (value: number | undefined): number =>
  Number.isFinite(value) && Number(value) > 0 ? Number(value) : 0;

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(Math.max(value, minimum), maximum);

/**
 * Resolves the launch geometry without reading device globals so the full
 * viewport/font-scale matrix can be tested deterministically.
 */
export function getAppLaunchLayout({
  width,
  height,
  fontScale,
  topInset = 0,
  bottomInset = 0,
}: AppLaunchLayoutInput): AppLaunchLayout {
  const safeWidth = finiteNonNegative(width);
  const safeHeight = finiteNonNegative(height);
  const safeFontScale = finiteNonNegative(fontScale) || 1;
  const usableHeight = Math.max(
    0,
    safeHeight - finiteNonNegative(topInset) - finiteNonNegative(bottomInset),
  );
  const widthClass = getWidthClass(safeWidth);
  const isShort = usableHeight < 640;
  const isVeryShort = usableHeight < 520;
  const usesLargeText = safeFontScale >= 1.3;
  const usesExtraLargeText = safeFontScale >= 1.75;

  const horizontalPadding = widthClass === 'compact'
    ? 12
    : widthClass === 'large'
      ? 20
      : 16;
  const contentMaxWidth = widthClass === 'large' ? 420 : 360;

  let preferredLogoSize = widthClass === 'large'
    ? MAX_LOGO_FRAME_SIZE
    : widthClass === 'compact'
      ? 156
      : 176;

  if (isShort || usesLargeText) {
    preferredLogoSize = Math.min(preferredLogoSize, 144);
  }
  if (isVeryShort || usesExtraLargeText) {
    preferredLogoSize = Math.min(preferredLogoSize, 120);
  }

  const availableLogoWidth = Math.max(
    MIN_LOGO_FRAME_SIZE,
    safeWidth - (horizontalPadding * 2) - 64,
  );
  const logoFrameSize = Math.round(clamp(
    Math.min(preferredLogoSize, availableLogoWidth),
    MIN_LOGO_FRAME_SIZE,
    MAX_LOGO_FRAME_SIZE,
  ));

  return {
    widthClass,
    usableHeight,
    horizontalPadding,
    verticalPadding: isVeryShort ? 8 : isShort || usesLargeText ? 12 : 24,
    contentMaxWidth,
    logoFrameSize,
    taglineGap: isVeryShort ? 8 : isShort || usesLargeText ? 12 : 24,
    progressGap: isVeryShort ? 6 : isShort || usesLargeText ? 8 : 16,
    stackProgress: widthClass === 'compact' || usesLargeText,
  };
}
