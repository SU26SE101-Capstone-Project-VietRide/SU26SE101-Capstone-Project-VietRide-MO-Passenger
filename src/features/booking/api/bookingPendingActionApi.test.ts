import { apiClient } from '@shared/api/axiosInstance';
import type { ApiSuccessEnvelope } from '@shared/api/errors';
import { resolveBookingPendingAction } from './bookingPendingActionApi';

jest.mock('@shared/api/axiosInstance', () => ({
  apiClient: {
    post: jest.fn(),
  },
}));

const postMock = jest.mocked(apiClient.post);
const BOOKING_ID = '11111111-1111-4111-8111-111111111111';
const ACTION_ID = '22222222-2222-4222-8222-222222222222';
const STOP_ID = '33333333-3333-4333-8333-333333333333';
const IDEMPOTENCY_KEY = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

describe('resolveBookingPendingAction', () => {
  beforeEach(() => {
    postMock.mockReset();
  });

  it('posts ACCEPTED schedule-change without a selected stop', async () => {
    postMock.mockResolvedValue({
      data: {
        success: true,
        statusCode: 200,
        data: {
          bookingId: BOOKING_ID,
          actionId: ACTION_ID,
          resolvedAction: 'ACCEPTED',
          resolvedAt: '2026-08-16T03:00:00Z',
        },
      } satisfies ApiSuccessEnvelope<{
        bookingId: string;
        actionId: string;
        resolvedAction: 'ACCEPTED';
        resolvedAt: string;
      }>,
    });

    await expect(resolveBookingPendingAction(
      BOOKING_ID,
      ACTION_ID,
      { action: 'ACCEPTED' },
      IDEMPOTENCY_KEY,
    )).resolves.toEqual({
      bookingId: BOOKING_ID,
      actionId: ACTION_ID,
      resolvedAction: 'ACCEPTED',
      resolvedAt: '2026-08-16T03:00:00Z',
    });

    expect(postMock).toHaveBeenCalledWith(
      `/bookings/${BOOKING_ID}/pending-actions/${ACTION_ID}/resolve`,
      { action: 'ACCEPTED' },
      { headers: { 'Idempotency-Key': IDEMPOTENCY_KEY } },
    );
  });

  it('posts ROUTE_CHANGE accept with exactly one selected identity', async () => {
    postMock.mockResolvedValue({
      data: {
        success: true,
        statusCode: 200,
        data: {
          bookingId: BOOKING_ID,
          actionId: ACTION_ID,
          resolvedAction: 'ACCEPTED',
          resolvedAt: '2026-08-16T03:00:00Z',
        },
      },
    });

    await resolveBookingPendingAction(
      BOOKING_ID,
      ACTION_ID,
      {
        action: 'ACCEPTED',
        selectedStopId: STOP_ID,
        selectedStationId: null,
      },
      IDEMPOTENCY_KEY,
    );

    expect(postMock).toHaveBeenCalledWith(
      `/bookings/${BOOKING_ID}/pending-actions/${ACTION_ID}/resolve`,
      {
        action: 'ACCEPTED',
        selectedStopId: STOP_ID,
        selectedStationId: null,
      },
      { headers: { 'Idempotency-Key': IDEMPOTENCY_KEY } },
    );
  });
});
