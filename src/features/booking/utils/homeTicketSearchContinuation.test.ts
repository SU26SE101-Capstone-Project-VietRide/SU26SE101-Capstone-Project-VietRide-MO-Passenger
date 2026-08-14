import { resolveHomeTicketSearchContinuation } from './homeTicketSearchContinuation';

const NOW = new Date('2026-08-14T05:00:00.000Z');

describe('resolveHomeTicketSearchContinuation', () => {
  it('searches immediately when a one-way departure date is already valid', () => {
    expect(resolveHomeTicketSearchContinuation({
      departureDate: '2026-08-18',
      isRoundTrip: false,
      now: NOW,
    })).toBe('search');
  });

  it.each(['', 'not-a-date', '2026-08-13'])(
    'asks for a departure date when the existing value is %p',
    (departureDate) => {
      expect(resolveHomeTicketSearchContinuation({
        departureDate,
        isRoundTrip: false,
        now: NOW,
      })).toBe('select_departure');
    },
  );

  it.each(['', 'not-a-date', '2026-08-17'])(
    'asks for a return date when the existing value is %p',
    (returnDate) => {
      expect(resolveHomeTicketSearchContinuation({
        departureDate: '2026-08-18',
        returnDate,
        isRoundTrip: true,
        now: NOW,
      })).toBe('select_return');
    },
  );

  it('searches immediately when both round-trip dates are already valid', () => {
    expect(resolveHomeTicketSearchContinuation({
      departureDate: '2026-08-18',
      returnDate: '2026-08-20',
      isRoundTrip: true,
      now: NOW,
    })).toBe('search');
  });
});
