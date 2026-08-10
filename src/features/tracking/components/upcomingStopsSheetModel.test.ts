import {
  DEFAULT_UPCOMING_SHEET_COLLAPSED_HEIGHT,
  MIN_UPCOMING_SHEET_COLLAPSED_HEIGHT,
  getUpcomingStopsSheetLayout,
} from './upcomingStopsSheetModel';

describe('getUpcomingStopsSheetLayout', () => {
  it('keeps the content-height collapsed snap on a normal portrait body', () => {
    expect(getUpcomingStopsSheetLayout(600)).toEqual({
      collapsedHeight: DEFAULT_UPCOMING_SHEET_COLLAPSED_HEIGHT,
      collapsedOffset: 324,
      expandedHeight: 456,
    });
  });

  it('caps the collapsed sheet at 30 percent in a short landscape body', () => {
    const layout = getUpcomingStopsSheetLayout(320, 180);

    expect(layout.expandedHeight).toBeCloseTo(243.2);
    expect(layout.collapsedHeight).toBe(96);
    expect(320 - layout.collapsedHeight).toBeGreaterThanOrEqual(320 * 0.7);
  });

  it('never lets a large-font measurement exceed the expanded snap', () => {
    const layout = getUpcomingStopsSheetLayout(120, 400);

    expect(layout.collapsedHeight).toBe(MIN_UPCOMING_SHEET_COLLAPSED_HEIGHT);
    expect(layout.expandedHeight).toBeCloseTo(91.2);
    expect(layout.collapsedOffset).toBeGreaterThan(0);
  });

  it('uses the measured one-row compact preview when it fits below the cap', () => {
    const layout = getUpcomingStopsSheetLayout(320, 64);

    expect(layout.collapsedHeight).toBe(64);
    expect(320 - layout.collapsedHeight).toBeGreaterThanOrEqual(320 * 0.7);
  });
});
