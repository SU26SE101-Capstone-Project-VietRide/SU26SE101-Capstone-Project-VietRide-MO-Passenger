import { getWidthClass } from '@shared/layout/responsive';

import {
  DATE_PICKER_COLUMN_COUNT,
  getDatePickerCalendarLayout,
  resolveDatePickerFooterHeight,
} from './datePickerLayout';

describe('getDatePickerCalendarLayout', () => {
  it.each([320, 360, 390, 430])(
    'keeps all seven day cells at least 44dp wide at %idp',
    (width) => {
      const layout = getDatePickerCalendarLayout(width, getWidthClass(width));
      const occupiedWidth = (
        layout.marginHorizontal * 2
        + layout.padding * 2
        + layout.cellWidth * DATE_PICKER_COLUMN_COUNT
      );

      expect(layout.cellWidth).toBeGreaterThanOrEqual(44);
      expect(occupiedWidth).toBeCloseTo(width, 5);
    },
  );

  it('fails closed for an invalid measured width', () => {
    expect(getDatePickerCalendarLayout(Number.NaN, 'compact')).toEqual({
      marginHorizontal: 4,
      padding: 0,
      cellWidth: 0,
    });
  });
});

describe('resolveDatePickerFooterHeight', () => {
  it('rounds a valid measured footer height up to preserve clearance', () => {
    expect(resolveDatePickerFooterHeight(88, 104.2)).toBe(105);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'keeps the fallback for invalid measurement %p',
    (measuredHeight) => {
      expect(resolveDatePickerFooterHeight(88, measuredHeight)).toBe(88);
    },
  );
});