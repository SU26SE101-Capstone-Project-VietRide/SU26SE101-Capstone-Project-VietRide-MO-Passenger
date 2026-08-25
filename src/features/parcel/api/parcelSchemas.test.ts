import {
  parcelIncidentTypeSchema,
  parcelPassengerActionsSchema,
  parseParcelTrace,
  parseReceivedParcelPage,
  parseSentParcelPage,
} from './parcelSchemas';

const IDS = {
  parcel: '11111111-1111-4111-8111-111111111111',
  trip: '22222222-2222-4222-8222-222222222222',
  user: '33333333-3333-4333-8333-333333333333',
  operator: '44444444-4444-4444-8444-444444444444',
  event: '55555555-5555-4555-8555-555555555555',
  location: '66666666-6666-4666-8666-666666666666',
} as const;

const NOW = '2026-08-22T09:00:00+07:00';

const reliability = {
  currentCustody: {
    lastEventType: 'LOADED',
    lastConfirmedLocation: {
      type: 'STATION',
      id: IDS.location,
      name: 'Bến xe',
      orderIndex: 1,
      eta: null,
    },
    lastConfirmedAt: NOW,
    currentTripId: IDS.trip,
    currentVehicleId: null,
    trackingConfidence: 'HIGH',
    hasTrackingGap: false,
  },
  activeIncident: null,
  claim: null,
  nextUpdateAt: null,
  availableActions: ['REPORT_INCIDENT', 'OPERATOR_RESCAN'],
};

const sentItem = {
  parcelId: IDS.parcel,
  parcelCode: 'PCL-001',
  tripId: IDS.trip,
  status: 'IN_TRANSIT',
  createdAt: NOW,
  totalAmount: 100_000,
  originName: 'Hà Nội',
  destinationName: 'Đà Nẵng',
  departureDateTime: NOW,
  estimatedArrivalTime: null,
  bookingId: null,
  recipientName: 'Người nhận',
  sizeCategory: 'MEDIUM',
  photoUrl: null,
  deliveryMethod: 'TERMINAL_PICKUP',
  operator: null,
  dropoffLocation: null,
  reliability,
};

const page = (items: unknown[]) => ({
  items,
  page: 1,
  pageSize: 10,
  totalItems: items.length,
  totalPages: items.length ? 1 : 0,
  hasNextPage: false,
  hasPreviousPage: false,
});

const trace = {
  parcelId: IDS.parcel,
  parcelCode: 'PCL-001',
  parcelStatus: 'IN_TRANSIT',
  parcelSummary: {
    parcelId: IDS.parcel,
    parcelCode: 'PCL-001',
    status: 'IN_TRANSIT',
    description: null,
    photoUrl: null,
    quantity: 1,
    declaredValueVnd: 2_000_000,
  },
  operator: { operatorId: IDS.operator },
  trip: { tripId: IDS.trip },
  dropoffLocation: { type: 'STATION', id: IDS.location },
  currentCustody: {
    lastEventType: 'LOADED',
    lastLocationType: 'STATION',
    lastLocationId: IDS.location,
    lastLocationSnapshot: 'Bến xe',
    lastConfirmedAt: NOW,
    currentTripId: IDS.trip,
    currentVehicleId: null,
    trackingConfidence: 'HIGH',
  },
  activeIncident: null,
  forwardingTrip: null,
  claimSummary: null,
  availableActions: ['REPORT_INCIDENT', 'OPERATOR_RESCAN'],
  timeline: {
    items: [{
      eventId: IDS.event,
      eventType: 'LOADED',
      tripId: IDS.trip,
      expectedLocationType: 'STATION',
      expectedLocationId: IDS.location,
      actualLocationType: 'STATION',
      actualLocationId: IDS.location,
      locationSnapshot: 'Bến xe',
      occurredAt: NOW,
      actorRole: 'ASSISTANT',
      source: 'SCAN',
      reason: null,
      sequence: 9,
    }],
    nextCursor: 'opaque:cursor+with/slashes==',
  },
  incidents: [],
  nextUpdateAt: null,
};

describe('Parcel Reliability contract schemas', () => {
  it('allow-lists Passenger actions and silently drops operator-only values', () => {
    expect(parcelPassengerActionsSchema.parse([
      'REPORT_INCIDENT',
      'OPERATOR_RESCAN',
      'APPEAL',
    ])).toEqual(['REPORT_INCIDENT', 'APPEAL']);
  });

  it('parses sent pages with embedded Reliability and safe VND integers', () => {
    const parsed = parseSentParcelPage(page([sentItem]));
    expect(parsed.items[0].reliability?.availableActions).toEqual(['REPORT_INCIDENT']);
    expect(parsed.items[0].totalAmount).toBe(100_000);
  });

  it('parses received pages without inventing unsupported filters', () => {
    const parsed = parseReceivedParcelPage(page([{
      parcelId: IDS.parcel,
      parcelCode: 'PCL-001',
      status: 'IN_TRANSIT',
      originStation: { id: IDS.location, name: 'Hà Nội' },
      destinationStation: null,
      eta: null,
      senderUserId: IDS.user,
      recipientName: null,
      sizeCategory: 'SMALL',
      createdAt: NOW,
      operatorId: IDS.operator,
      tripId: IDS.trip,
      operator: null,
      dropoffLocation: null,
      reliability: null,
    }]));
    expect(parsed.items[0].recipientName).toBeNull();
  });

  it('keeps trace cursor opaque and uses the flat custody wire shape', () => {
    const parsed = parseParcelTrace(trace);
    expect(parsed.timeline.nextCursor).toBe('opaque:cursor+with/slashes==');
    expect(parsed.currentCustody?.lastLocationSnapshot).toBe('Bến xe');
    expect(parsed.availableActions).toEqual(['REPORT_INCIDENT']);
  });

  it('does not accept list/detail nested custody as trace custody', () => {
    expect(() => parseParcelTrace({
      ...trace,
      currentCustody: reliability.currentCustody,
    })).toThrow();
  });

  it('does not accept trace flat custody as list/detail custody', () => {
    expect(() => parseSentParcelPage(page([{
      ...sentItem,
      reliability: {
        ...reliability,
        currentCustody: trace.currentCustody,
      },
    }]))).toThrow();
  });

  it('preserves an unknown read-model status for forward-compatible presentation', () => {
    const parsed = parseSentParcelPage(page([{
      ...sentItem,
      status: 'NEW_BE_STATUS',
    }]));
    expect(parsed.items[0].status).toBe('NEW_BE_STATUS');
  });

  it('rejects unknown incident enum values, unsafe money, invalid UUID/RFC3339, and bad pages', () => {
    expect(() => parcelIncidentTypeSchema.parse('OPERATOR_DELAY')).toThrow();
    expect(() => parseSentParcelPage(page([{
      ...sentItem,
      totalAmount: Number.MAX_SAFE_INTEGER + 1,
    }]))).toThrow();
    expect(() => parseSentParcelPage(page([{
      ...sentItem,
      parcelId: 'not-a-uuid',
    }]))).toThrow();
    expect(() => parseSentParcelPage(page([{
      ...sentItem,
      createdAt: '2026-08-22',
    }]))).toThrow();
    expect(() => parseSentParcelPage({ ...page([]), page: 0 })).toThrow();
  });
});
