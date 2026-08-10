import {
  addApiCalendarDays,
  apiCalendarDateSchema,
  apiInstantSchema,
  assertApiInstantRange,
  assertBackendInstant,
  compareInstants,
  toRequestInstant,
  toVietnamBusinessDate,
} from './apiTime';

describe('API time contract', () => {
  it.each([
    '2026-07-20T08:00:00Z',
    '2026-07-20T15:00:00+07:00',
    '2026-07-20T08:00:00.1Z',
    '2026-07-20T08:00:00.1234567Z',
  ])('accepts RFC 3339 instant %s', (value) => {
    expect(apiInstantSchema.safeParse(value).success).toBe(true);
  });

  it.each([
    '2026-07-20T08:00:00',
    '2026-07-20',
    'not-a-date',
  ])('rejects offsetless or invalid instant %s', (value) => {
    expect(apiInstantSchema.safeParse(value).success).toBe(false);
  });

  it('resolves today at the Vietnam midnight boundary', () => {
    expect(toVietnamBusinessDate('2026-07-13T16:59:59Z')).toBe('2026-07-13');
    expect(toVietnamBusinessDate('2026-07-13T17:00:00Z')).toBe('2026-07-14');
  });

  it('adds calendar days without an instant conversion', () => {
    expect(addApiCalendarDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(apiCalendarDateSchema.safeParse('2026-02-29').success).toBe(false);
  });

  it('validates explicit offsets and request ordering', () => {
    expect(() => assertApiInstantRange({
      from: '2026-07-20T08:00:00Z',
      to: '2026-07-20T15:00:00+07:00',
    })).not.toThrow();
    expect(() => assertApiInstantRange({
      from: '2026-07-20T08:00:01Z',
      to: '2026-07-20T08:00:00Z',
    })).toThrow(/from must be before or equal to to/);
    expect(() => assertApiInstantRange({
      from: '2026-07-20T08:00:00',
    })).toThrow();
    expect(() => assertApiInstantRange({
      from: '2026-07-20T08:00:00Z',
      to: '2026-07-20T15:00:00+07:00',
    }, { allowEqual: false })).toThrow(/from must be before to/);
  });

  it('compares Z and +07:00 as the same absolute instant', () => {
    expect(compareInstants(
      '2026-08-10T05:00:00Z',
      '2026-08-10T12:00:00.000+07:00',
    )).toBe(0);
    expect(assertBackendInstant('2026-08-10T12:00:00.0000000+07:00'))
      .toBe('2026-08-10T12:00:00.0000000+07:00');
    expect(toRequestInstant(new Date('2026-08-10T05:00:00.000Z')))
      .toBe('2026-08-10T05:00:00.000Z');
  });
});
