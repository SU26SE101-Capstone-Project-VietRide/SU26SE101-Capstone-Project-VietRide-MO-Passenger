import {
  createIdempotencyKey,
  IDEMPOTENCY_KEY_UUID_V4_PATTERN,
  IdempotencyKeyTracker,
} from './idempotency';

describe('idempotency helpers', () => {
  it('creates backend-compatible UUID v4 keys', () => {
    const first = createIdempotencyKey('booking mobile');
    const second = createIdempotencyKey('booking mobile');

    expect(first).toMatch(IDEMPOTENCY_KEY_UUID_V4_PATTERN);
    expect(second).toMatch(IDEMPOTENCY_KEY_UUID_V4_PATTERN);
    expect(second).not.toBe(first);
  });

  it('reuses a key for retries of the same payload and rotates for new work', () => {
    const tracker = new IdempotencyKeyTracker('parcel-mobile');
    const first = tracker.getOrCreate({ tripId: 'one', amount: 100 });

    expect(tracker.getOrCreate({ tripId: 'one', amount: 100 })).toBe(first);
    expect(tracker.getOrCreate({ tripId: 'two', amount: 100 })).not.toBe(first);

    const beforeReset = tracker.getOrCreate({ tripId: 'two', amount: 100 });
    tracker.reset();
    expect(tracker.getOrCreate({ tripId: 'two', amount: 100 })).not.toBe(beforeReset);
  });
});
