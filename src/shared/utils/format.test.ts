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
    const timestamp = '2026-07-13T08:30:00+07:00';
    expect(formatDate(timestamp)).toBe('13/07/2026');
    expect(formatTime(timestamp)).toMatch(/08:30|01:30/);
    expect(formatShortDate(timestamp)).toMatch(/1[23][\/-]07/);
    expect(formatMonthYear(timestamp, 'en-US')).toMatch(/July 2026/);
    expect(formatDateTime(timestamp)).toMatch(/13[\/-]07[\/-]2026.*(?:08:30|01:30)/);
  });

  it('normalizes countdown values', () => {
    expect(formatCountdown(301)).toBe('05:01');
    expect(formatCountdown(-2)).toBe('00:00');
    expect(formatCountdown(Number.NaN)).toBe('00:00');
  });
});
