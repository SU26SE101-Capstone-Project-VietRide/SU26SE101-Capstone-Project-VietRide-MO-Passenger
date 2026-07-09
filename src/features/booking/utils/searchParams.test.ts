import { toTripSearchDate } from './searchParams';

describe('toTripSearchDate', () => {
  it('keeps API date values unchanged', () => {
    expect(toTripSearchDate('2026-07-10')).toBe('2026-07-10');
  });

  it('converts display dates to API format', () => {
    expect(toTripSearchDate('10/07/2026')).toBe('2026-07-10');
  });

  it('rejects unsupported date values', () => {
    expect(() => toTripSearchDate('next Friday')).toThrow(
      'Please select a valid departure date.',
    );
  });
});
