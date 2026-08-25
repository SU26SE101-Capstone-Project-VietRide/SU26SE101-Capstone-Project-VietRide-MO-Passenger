import {
  buildCreateParcelPayload,
  type CreateParcelDraft,
} from './createParcelPayload';

const makeDraft = (): CreateParcelDraft => ({
  tripId: 'trip-1',
  quoteToken: 'opaque.signed-quote',
  dropoffStopId: null,
  bookingId: null,
  itemName: 'Documents',
  description: null,
  sizeCategory: 'MEDIUM',
  lengthCm: 45,
  widthCm: 35,
  heightCm: 25,
  estimatedWeightKg: 2.5,
  declaredValueVnd: 2_500_000,
  quantity: 1,
  photoUrl: null,
  recipient: {
    fullName: 'Passenger',
    phoneNumber: '+84901234567',
    email: 'passenger@example.com',
  },
  deliveryMethod: 'TERMINAL_PICKUP',
  paymentMethod: 'VNPAY',
  voucherCode: null,
});

describe('Create Parcel contract bounds', () => {
  it.each([0, 1.5, 10_001])('rejects quantity %p outside integer bounds', (quantity) => {
    expect(() => buildCreateParcelPayload({
      ...makeDraft(),
      quantity,
    })).toThrow('Parcel quantity');
  });

  it('rejects negative, fractional, or unsafe declared VND values', () => {
    [-1, 2.5, Number.MAX_SAFE_INTEGER + 1].forEach((declaredValueVnd) => {
      expect(() => buildCreateParcelPayload({
        ...makeDraft(),
        declaredValueVnd,
      })).toThrow('declared value');
    });
  });

  it('normalizes blank optional email to null and validates a supplied email', () => {
    const draft = makeDraft();
    expect(buildCreateParcelPayload({
      ...draft,
      recipient: { ...draft.recipient, email: '  ' },
    }).recipient.email).toBeNull();
    expect(() => buildCreateParcelPayload({
      ...draft,
      recipient: { ...draft.recipient, email: 'invalid' },
    })).toThrow('recipient email');
  });

  it('preserves first-class declared value, quantity, and quote token fields', () => {
    const payload = buildCreateParcelPayload(makeDraft());
    expect(payload).toMatchObject({
      quoteToken: 'opaque.signed-quote',
      declaredValueVnd: 2_500_000,
      quantity: 1,
      description: null,
    });
  });
});
