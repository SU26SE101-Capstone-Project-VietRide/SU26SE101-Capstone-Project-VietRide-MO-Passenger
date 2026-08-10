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

  it.each(['', '31/02/2026', '2026-99-99'])('rejects invalid date value %p', (value) => {
    expect(() => toTripSearchDate(value)).toThrow(
      'Please select a valid departure date.',
    );
  });

  it('resolves relative labels against the Vietnam business date', () => {
    const beforeMidnight = new Date('2026-07-13T16:59:59Z');
    const atMidnight = new Date('2026-07-13T17:00:00Z');
    expect(toTripSearchDate('Today', beforeMidnight)).toBe('2026-07-13');
    expect(toTripSearchDate('Tomorrow', beforeMidnight)).toBe('2026-07-14');
    expect(toTripSearchDate('Today', atMidnight)).toBe('2026-07-14');
  });
});
