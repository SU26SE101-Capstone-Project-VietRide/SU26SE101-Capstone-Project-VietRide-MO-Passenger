import { buildCreateParcelPayload } from './createParcelPayload';

describe('buildCreateParcelPayload', () => {
  it('excludes every local preview URI and keeps photoUrl null', () => {
    const payload = buildCreateParcelPayload({
      tripId: 'trip-1',
      quoteToken: 'opaque.signed-quote',
      dropoffStopId: null,
      bookingId: null,
      itemName: 'Documents',
      description: 'Category: Documents',
      sizeCategory: 'MEDIUM',
      lengthCm: 45,
      widthCm: 35,
      heightCm: 25,
      estimatedWeightKg: 2.5,
      declaredValueVnd: 2_500_000,
      quantity: 2,
      localPhotoUris: [
        'file:///private/parcel-one.jpg',
        'content://media/external/parcel-two.jpg',
        'ph://apple-local-photo-id',
      ],
      recipient: {
        fullName: 'Passenger',
        phoneNumber: '+84901234567',
        email: 'passenger@example.com',
      },
      deliveryMethod: 'TERMINAL_PICKUP',
      paymentMethod: 'VNPAY',
      voucherCode: null,
    });

    expect(payload.photoUrl).toBeNull();
    expect(payload.quoteToken).toBe('opaque.signed-quote');
    expect(payload.declaredValueVnd).toBe(2_500_000);
    expect(payload.quantity).toBe(2);
    expect(payload).not.toHaveProperty('localPhotoUris');
    const serializedPayload = JSON.stringify(payload);
    expect(serializedPayload).not.toContain('file://');
    expect(serializedPayload).not.toContain('content://');
    expect(serializedPayload).not.toContain('ph://');
  });
});
