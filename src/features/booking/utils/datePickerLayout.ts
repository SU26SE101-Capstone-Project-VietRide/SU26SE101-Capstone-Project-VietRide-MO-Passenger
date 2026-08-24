import type { WidthClass } from '@shared/layout/responsive';
import { spacing } from '@shared/theme';

export const DATE_PICKER_COLUMN_COUNT = 7;

export interface DatePickerCalendarLayout {
  readonly marginHorizontal: number;
  readonly padding: number;
  readonly cellWidth: number;
}

const widthClassInsets: Record<WidthClass, Pick<DatePickerCalendarLayout, 'marginHorizontal' | 'padding'>> = {
  compact: {
    marginHorizontal: spacing.xs,
    padding: 0,
  },
  regular: {
    marginHorizontal: spacing.md,
    padding: spacing.xs,
  },
  large: {
    marginHorizontal: spacing.xl,
    padding: spacing.md,
  },
};

/** Ignores transient invalid layout passes so content clearance never collapses. */
export function resolveDatePickerFooterHeight(
  currentHeight: number,
  measuredHeight: number,
): number {
  if (!Number.isFinite(measuredHeight) || measuredHeight <= 0) {
    return currentHeight;
  }

  return Math.ceil(measuredHeight);
}

/** Keeps seven calendar columns usable at the supported 320dp minimum width. */
export function getDatePickerCalendarLayout(
  viewportWidth: number,
  widthClass: WidthClass,
): DatePickerCalendarLayout {
  const safeWidth = Number.isFinite(viewportWidth)
    ? Math.max(0, viewportWidth)
    : 0;
  const { marginHorizontal, padding } = widthClassInsets[widthClass];
  const innerWidth = Math.max(
    0,
    safeWidth - (marginHorizontal + padding) * 2,
  );

  return {
    marginHorizontal,
    padding,
    cellWidth: innerWidth / DATE_PICKER_COLUMN_COUNT,
  };
}
