import { spacing } from '@shared/theme';

export const SNACKBAR_MAX_WIDTH = 520;
export const TAB_BAR_HEIGHT_COMPACT = 68;
export const TAB_BAR_HEIGHT_REGULAR = 76;

interface SnackbarBottomOffsetOptions {
  bottomInset: number;
  isCompact: boolean;
  isMainTabActive: boolean;
}

export const getSnackbarBottomOffset = ({
  bottomInset,
  isCompact,
  isMainTabActive,
}: SnackbarBottomOffsetOptions): number => {
  const safeBottom = Math.max(bottomInset, spacing.sm);
  if (!isMainTabActive) return safeBottom + spacing.md;

  const tabBarHeight = isCompact
    ? TAB_BAR_HEIGHT_COMPACT
    : TAB_BAR_HEIGHT_REGULAR;
  return safeBottom + tabBarHeight + spacing.lg;
};
