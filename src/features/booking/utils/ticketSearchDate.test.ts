import { formatTicketSearchDate } from './ticketSearchDate';

describe('formatTicketSearchDate', () => {
  it('uses MM/DD/YY for English', () => {
    expect(formatTicketSearchDate('2026-07-13', 'en')).toBe('07/13/26');
    expect(formatTicketSearchDate('2026-07-13', 'en-US')).toBe('07/13/26');
  });

  it('uses DD/MM/YY for Vietnamese', () => {
    expect(formatTicketSearchDate('2026-07-13', 'vi')).toBe('13/07/26');
    expect(formatTicketSearchDate('2026-07-13', 'vi-VN')).toBe('13/07/26');
  });

  it('fails closed for invalid calendar dates', () => {
    expect(formatTicketSearchDate('2026-02-30', 'en')).toBe('');
    expect(formatTicketSearchDate('not-a-date', 'vi')).toBe('');
  });
});
