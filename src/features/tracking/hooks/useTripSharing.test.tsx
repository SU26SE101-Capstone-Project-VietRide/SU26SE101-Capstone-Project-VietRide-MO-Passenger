import React from 'react';
import { Share } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

const mockCreateTripShareLink = jest.fn();
const mockRevokeTripShareLink = jest.fn();

jest.mock('../api/tripShareApi', () => ({
  createTripShareLink: (...args: unknown[]) => mockCreateTripShareLink(...args),
  revokeTripShareLink: (...args: unknown[]) => mockRevokeTripShareLink(...args),
}));

jest.mock('@shared/api/idempotency', () => ({
  IdempotencyKeyTracker: class {
    getOrCreate(): string {
      return '11111111-1111-4111-8111-111111111111';
    }

    reset(): void {}
  },
}));

jest.mock('@shared/utils/storage', () => ({
  getTokenSessionEpoch: () => 1,
  isTokenSessionEpochCurrent: () => true,
}));

import { useTripSharing } from './useTripSharing';

const tripId = '22222222-2222-4222-8222-222222222222';

describe('useTripSharing active grant state', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    mockCreateTripShareLink.mockReset();
    mockRevokeTripShareLink.mockReset();
    mockCreateTripShareLink.mockResolvedValue({
      expiresAt: '2026-08-29T00:00:00.000Z',
      shareUrl: 'https://app.vietride.online/trip-sharing#token=test',
    });
    mockRevokeTripShareLink.mockResolvedValue({ revoked: true });
  });

  it('marks the grant active after PUT and clears it only after DELETE succeeds', async () => {
    let resolveNativeShare:
      | ((value: Awaited<ReturnType<typeof Share.share>>) => void)
      | undefined;
    const nativeShareResult = new Promise<
      Awaited<ReturnType<typeof Share.share>>
    >((resolve) => {
      resolveNativeShare = resolve;
    });
    jest.spyOn(Share, 'share').mockReturnValue(nativeShareResult);

    let latest: ReturnType<typeof useTripSharing> | undefined;
    function Harness(): null {
      latest = useTripSharing();
      return null;
    }

    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(<Harness />);
    });

    let shareOperation: Promise<unknown> | undefined;
    await act(async () => {
      shareOperation = latest!.shareTrip({
        tripId,
        message: 'Follow this trip',
      });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockCreateTripShareLink).toHaveBeenCalledWith(
      tripId,
      '11111111-1111-4111-8111-111111111111',
      expect.any(AbortSignal),
    );
    expect(latest!.activeTripId).toBe(tripId);
    expect(latest!.isSharing).toBe(true);

    await act(async () => {
      resolveNativeShare?.({ action: Share.sharedAction });
      await shareOperation;
    });
    expect(latest!.activeTripId).toBe(tripId);
    expect(latest!.isSharing).toBe(false);

    await act(async () => {
      await latest!.revokeTripShare({ tripId });
    });
    expect(mockRevokeTripShareLink).toHaveBeenCalledWith(
      tripId,
      '11111111-1111-4111-8111-111111111111',
      expect.any(AbortSignal),
    );
    expect(latest!.activeTripId).toBeNull();

    await act(async () => renderer!.unmount());
  });
});
