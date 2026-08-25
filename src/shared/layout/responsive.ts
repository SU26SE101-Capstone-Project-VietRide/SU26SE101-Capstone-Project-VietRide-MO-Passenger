export const responsiveBreakpoints = {
  compact: 360,
  large: 430,
} as const;

export type WidthClass = 'compact' | 'regular' | 'large';

export function getWidthClass(width: number): WidthClass {
  if (width < responsiveBreakpoints.compact) {
    return 'compact';
  }

  if (width >= responsiveBreakpoints.large) {
    return 'large';
  }

  return 'regular';
}
