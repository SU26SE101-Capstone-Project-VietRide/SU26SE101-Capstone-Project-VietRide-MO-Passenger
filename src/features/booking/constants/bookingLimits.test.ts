import {
  isValidBookingSeatCount,
  MAX_BOOKING_SEATS,
  MIN_BOOKING_SEATS,
  normalizeBookingSeatCount,
} from './bookingLimits';

describe('booking seat limits', () => {
  it('matches the backend 1-5 seat contract', () => {
    expect(MIN_BOOKING_SEATS).toBe(1);
    expect(MAX_BOOKING_SEATS).toBe(5);
    expect(isValidBookingSeatCount(1)).toBe(true);
    expect(isValidBookingSeatCount(5)).toBe(true);
    expect(isValidBookingSeatCount(0)).toBe(false);
    expect(isValidBookingSeatCount(6)).toBe(false);
  });

  it('normalizes untrusted UI and persisted values', () => {
    expect(normalizeBookingSeatCount(Number.NaN)).toBe(1);
    expect(normalizeBookingSeatCount(-2)).toBe(1);
    expect(normalizeBookingSeatCount(2.9)).toBe(2);
    expect(normalizeBookingSeatCount(20)).toBe(5);
  });
});
