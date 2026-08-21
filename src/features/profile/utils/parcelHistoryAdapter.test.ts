import type { ReceivedParcel, SentParcel } from '@features/parcel/types';
import {
  mapReceivedParcelToHistoryItem,
  mapSentParcelToHistoryItem,
} from './parcelHistoryAdapter';

const reliability = {
  currentCustody: null,
  activeIncident: null,
  claim: null,
  nextUpdateAt: null,
  availableActions: ['REPORT_INCIDENT'] as const,
};

describe('Parcel role history adapter', () => {
  it('maps sent rows with embedded Reliability and a stop target without detail fan-out', () => {
    const sent: SentParcel = {
      parcelId: '11111111-1111-4111-8111-111111111111',
      parcelCode: 'PCL-001',
      tripId: '22222222-2222-4222-8222-222222222222',
      status: 'PENDING_PAYMENT',
      createdAt: '2026-08-22T09:00:00+07:00',
      totalAmount: 100_000,
      originName: 'Hà Nội',
      destinationName: 'Đà Nẵng',
      departureDateTime: null,
      estimatedArrivalTime: null,
      bookingId: null,
      recipientName: 'Người nhận',
      sizeCategory: 'SMALL',
      photoUrl: null,
      deliveryMethod: 'TERMINAL_PICKUP',
      operator: null,
      dropoffLocation: {
        type: 'STOP',
        id: '33333333-3333-4333-8333-333333333333',
        name: 'Điểm trả',
        orderIndex: 2,
        eta: null,
      },
      reliability: { ...reliability, availableActions: ['REPORT_INCIDENT'] },
    };
    const mapped = mapSentParcelToHistoryItem(sent);
    expect(mapped.parcel.role).toBe('SENT');
    expect(mapped.parcel.reliability).toBe(sent.reliability);
    expect(mapped.trackingTarget).toEqual({
      kind: 'STOP',
      stopId: sent.dropoffLocation?.id,
    });
  });

  it('maps received rows without inventing a payable amount or sent filters', () => {
    const received: ReceivedParcel = {
      parcelId: '11111111-1111-4111-8111-111111111111',
      parcelCode: 'PCL-001',
      status: 'IN_TRANSIT',
      originStation: null,
      destinationStation: null,
      eta: null,
      senderUserId: '44444444-4444-4444-8444-444444444444',
      recipientName: null,
      sizeCategory: 'SMALL',
      createdAt: '2026-08-22T09:00:00+07:00',
      operatorId: '55555555-5555-4555-8555-555555555555',
      tripId: '22222222-2222-4222-8222-222222222222',
      operator: null,
      dropoffLocation: null,
      reliability: null,
    };
    const mapped = mapReceivedParcelToHistoryItem(received);
    expect(mapped.parcel.role).toBe('RECEIVED');
    expect(mapped.totalAmount).toBe(0);
    expect(mapped.paymentRedirectUrl).toBeNull();
  });
});
