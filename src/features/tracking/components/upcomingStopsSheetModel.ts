export interface UpcomingStopsSheetLayout {
  collapsedHeight: number;
  collapsedOffset: number;
  expandedHeight: number;
}

export const DEFAULT_UPCOMING_SHEET_COLLAPSED_HEIGHT = 132;
export const UPCOMING_SHEET_EXPANDED_BODY_RATIO = 0.76;
export const MIN_UPCOMING_SHEET_COLLAPSED_HEIGHT = 72;
export const UPCOMING_SHEET_MAX_COLLAPSED_BODY_RATIO = 0.3;

/**
 * Targets a 70% collapsed map viewport and keeps a functional compact preview
 * on bodies too short to satisfy both constraints. Expanded starts at 24%.
 */
export const getUpcomingStopsSheetLayout = (
  containerHeight: number,
  measuredCollapsedHeight = DEFAULT_UPCOMING_SHEET_COLLAPSED_HEIGHT,
): UpcomingStopsSheetLayout => {
  const safeContainerHeight = Number.isFinite(containerHeight)
    ? Math.max(1, containerHeight)
    : 1;
  const safeMeasuredCollapsedHeight = Number.isFinite(measuredCollapsedHeight)
    ? Math.max(0, measuredCollapsedHeight)
    : DEFAULT_UPCOMING_SHEET_COLLAPSED_HEIGHT;
  const expandedHeight = safeContainerHeight * UPCOMING_SHEET_EXPANDED_BODY_RATIO;
  const maxCollapsedHeight = safeContainerHeight
    * UPCOMING_SHEET_MAX_COLLAPSED_BODY_RATIO;
  // A functional one-row compact preview takes precedence only when a body is
  // physically too short to preserve both it and the usual 70% map viewport.
  const availableCollapsedHeight = Math.max(
    maxCollapsedHeight,
    Math.min(MIN_UPCOMING_SHEET_COLLAPSED_HEIGHT, expandedHeight),
  );
  const collapsedHeight = Math.min(
    safeMeasuredCollapsedHeight,
    availableCollapsedHeight,
    expandedHeight,
  );

  return {
    collapsedHeight,
    collapsedOffset: Math.max(0, expandedHeight - collapsedHeight),
    expandedHeight,
  };
};
