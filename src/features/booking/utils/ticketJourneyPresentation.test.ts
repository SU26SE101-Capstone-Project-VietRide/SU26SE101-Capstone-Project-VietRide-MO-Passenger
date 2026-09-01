import {
  resolveTicketJourneyPoint,
  TICKET_JOURNEY_COLOR_TOKENS,
} from './ticketJourneyPresentation';

describe('ticket journey presentation', () => {
  it('prefers the passenger booked point over the route endpoint', () => {
    expect(resolveTicketJourneyPoint(
      'Pickup stop',
      'Origin station',
      'Unavailable',
    )).toEqual({
      name: 'Pickup stop',
      usesRouteEndpoint: false,
    });
  });

  it('falls back to the route endpoint when the booked point is null', () => {
    expect(resolveTicketJourneyPoint(
      null,
      'Origin station',
      'Unavailable',
    )).toEqual({
      name: 'Origin station',
      usesRouteEndpoint: true,
    });
  });

  it('keeps an unavailable label when both values are absent', () => {
    expect(resolveTicketJourneyPoint(null, null, 'Unavailable')).toEqual({
      name: 'Unavailable',
      usesRouteEndpoint: false,
    });
  });

  it('defines one semantic color mapping for History and Ticket Detail', () => {
    expect(TICKET_JOURNEY_COLOR_TOKENS).toEqual({
      pickup: 'primary',
      dropoff: 'success',
      dropoffHalo: 'successLight',
      connector: 'divider',
    });
  });
});
