import { useWindowDimensions } from 'react-native';

import { getWidthClass } from '@shared/layout/responsive';
import { spacing } from '@shared/theme';

export function useResponsiveLayout() {
  const { width, height, fontScale } = useWindowDimensions();

  const widthClass = getWidthClass(width);
  const isCompact = widthClass === 'compact';
  const isLarge = widthClass === 'large';
  const contentPaddingHorizontal = isCompact
    ? spacing.md
    : isLarge
      ? spacing.xl
      : spacing.lg;

  return {
    width,
    height,
    fontScale,
    widthClass,
    isCompact,
    isLarge,
    contentPaddingHorizontal,
  } as const;
}
