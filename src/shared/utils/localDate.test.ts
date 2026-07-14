import {
  addLocalDays,
  compareLocalDates,
  isValidLocalDate,
  parseLocalDate,
  toLocalDisplayDate,
  toLocalIsoDate,
} from './localDate';

describe('local date helpers', () => {
  it.each([
    ['2024-02-29', true],
    ['29/02/2024', true],
    ['2026-02-29', false],
    ['31/02/2026', false],
    ['2026-99-99', false],
    ['1/01/2026', false],
  ])('validates %s', (value, expected) => {
    expect(isValidLocalDate(value)).toBe(expected);
  });

  it('round-trips ISO and display values in local calendar time', () => {
    const date = parseLocalDate('13/07/2026');
    expect(date).not.toBeNull();
    expect(toLocalIsoDate(date!)).toBe('2026-07-13');
    expect(toLocalDisplayDate(date!)).toBe('13/07/2026');
  });

  it('adds and compares calendar days across month boundaries', () => {
    const july31 = parseLocalDate('2026-07-31')!;
    const august1 = addLocalDays(july31, 1);
    expect(toLocalIsoDate(august1)).toBe('2026-08-01');
    expect(compareLocalDates(august1, july31)).toBeGreaterThan(0);
  });
});
