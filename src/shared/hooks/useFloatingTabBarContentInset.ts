import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  FLOATING_TAB_BAR_COMPACT_HEIGHT,
  FLOATING_TAB_BAR_HEIGHT,
} from '@shared/constants/layout';
import { spacing } from '@shared/theme';
import { useResponsiveLayout } from './useResponsiveLayout';

/** Keeps scrollable tab content clear of the absolute floating bar. */
export function useFloatingTabBarContentInset(
  contentGap: number = spacing.huge,
): number {
  const { bottom } = useSafeAreaInsets();
  const { isCompact } = useResponsiveLayout();
  const tabBarHeight = isCompact
    ? FLOATING_TAB_BAR_COMPACT_HEIGHT
    : FLOATING_TAB_BAR_HEIGHT;

  return tabBarHeight + Math.max(bottom, spacing.sm) + contentGap;
}
