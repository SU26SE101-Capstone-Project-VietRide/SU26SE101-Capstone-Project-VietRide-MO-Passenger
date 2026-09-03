import {
  getSnackbarBottomOffset,
  TAB_BAR_HEIGHT_COMPACT,
  TAB_BAR_HEIGHT_REGULAR,
} from './snackbarLayout';
import { spacing } from '@shared/theme';

describe('getSnackbarBottomOffset', () => {
  it('clears the regular floating tab bar', () => {
    expect(getSnackbarBottomOffset({
      bottomInset: 24,
      isCompact: false,
      isMainTabActive: true,
    })).toBe(24 + TAB_BAR_HEIGHT_REGULAR + spacing.lg);
  });

  it('clears the compact floating tab bar', () => {
    expect(getSnackbarBottomOffset({
      bottomInset: 0,
      isCompact: true,
      isMainTabActive: true,
    })).toBe(spacing.sm + TAB_BAR_HEIGHT_COMPACT + spacing.lg);
  });

  it('uses only safe-area spacing outside the main tabs', () => {
    expect(getSnackbarBottomOffset({
      bottomInset: 20,
      isCompact: false,
      isMainTabActive: false,
    })).toBe(20 + spacing.md);
  });
});
