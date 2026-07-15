import {
  formatDate,
  formatDateTime,
  formatCountdown,
  formatMonthYear,
  formatShortDate,
  formatTime,
  formatVnd,
} from './format';

describe('shared formatters', () => {
  it('formats VND consistently and preserves meaningful negative values', () => {
    expect(formatVnd(150_000)).toMatch(/150[.\s]?000/);
    expect(formatVnd(150_000)).toContain('₫');
    expect(formatVnd(-20_000)).toMatch(/-/);
    expect(formatVnd(-20_000, { clampNegative: true })).not.toMatch(/-/);
  });

  it('returns an empty string for invalid timestamps', () => {
    expect(formatDate('not-a-date')).toBe('');
    expect(formatShortDate('not-a-date')).toBe('');
    expect(formatMonthYear('not-a-date')).toBe('');
    expect(formatDateTime('not-a-date')).toBe('');
    expect(formatTime('not-a-date')).toBe('');
  });

  it('reuses deterministic Vietnamese date and time semantics', () => {
    const localDate = new Date(2026, 6, 13, 8, 30);
    expect(formatDate(localDate)).toBe('13/07/2026');
    expect(formatTime(localDate)).toBe('08:30');
    expect(formatShortDate(localDate)).toMatch(/^13[/-]07$/);
    expect(formatMonthYear(localDate, 'en-US')).toMatch(/July 2026/);
    expect(formatDateTime(localDate)).toBe('13/07/2026 08:30');
  });

  it('keeps date-time fields in DD/MM/YYYY HH:mm order across locales', () => {
    const localDate = new Date(2026, 6, 13, 8, 30);

    expect(formatDateTime(localDate, 'en-US')).toBe('13/07/2026 08:30');
  });

  it('normalizes countdown values', () => {
    expect(formatCountdown(301)).toBe('05:01');
    expect(formatCountdown(-2)).toBe('00:00');
    expect(formatCountdown(Number.NaN)).toBe('00:00');
  });
});
