import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FLOATING_TAB_BAR_HEIGHT } from '@shared/constants/layout';
import { spacing } from '@shared/theme';

/**
 * Keeps the end of scrollable tab content clear of the absolute floating bar.
 * The extra gap matches the breathing room used by the 424c247 layout.
 */
export function useFloatingTabBarContentInset(
  contentGap: number = spacing.huge,
): number {
  const { bottom } = useSafeAreaInsets();

  return FLOATING_TAB_BAR_HEIGHT + Math.max(bottom, spacing.sm) + contentGap;
}

