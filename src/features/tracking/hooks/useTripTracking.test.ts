jest.mock('@features/auth/store/useAuthStore', () => ({
  useAuthStore: jest.fn(),
}));
jest.mock('@shared/hooks/useNetworkStatus', () => ({
  useNetworkStatus: jest.fn(),
}));
jest.mock('@react-navigation/native', () => ({
  useIsFocused: jest.fn(),
}));
jest.mock('../api/trackingApi', () => ({
  getTrackingEta: jest.fn(),
  getTrackingLatest: jest.fn(),
  getTrackingTrail: jest.fn(),
  trackingKeys: {
    latest: jest.fn(() => ['tracking', 'latest']),
    trail: jest.fn(() => ['tracking', 'trail']),
    eta: jest.fn(() => ['tracking', 'eta']),
  },
}));
jest.mock('../api/trackingRealtime', () => ({
  createTripTrackingConnection: jest.fn(),
}));
jest.mock('@shared/api/authSession', () => ({
  refreshAccessTokenAfterUnauthorized: jest.fn(),
  resolveStoredAccessToken: jest.fn(),
}));

import { ApiRequestError } from '@shared/api/errors';
import {
  MAX_TRACKING_TRAIL_POINTS,
  TRACKING_ETA_POLL_MS,
  TRACKING_LATEST_POLL_MS,
  TRACKING_TRAIL_REFRESH_MS,
  getFatalTrackingError,
  getTrackingExecutionPolicy,
  getNewestTrackingPoint,
  getTrackingRefetchInterval,
  isFatalTrackingError,
  isTerminalTrackingStatus,
  mergeTrackingPoints,
} from './useTripTracking';
import type { TrackingPoint } from '../api/trackingApi';

const point = (index: number): TrackingPoint => ({
  tripId: '11111111-1111-4111-8111-111111111111',
  latitude: 10 + index / 1000,
  longitude: 106 + index / 1000,
  recordedAt: new Date(Date.UTC(2026, 6, 14, 1, index)).toISOString(),
});

describe('trip tracking helpers', () => {
  it('deduplicates, sorts and caps locally appended latest points', () => {
    const persisted = Array.from({ length: MAX_TRACKING_TRAIL_POINTS }, (_, index) => point(index));
    const newest = point(MAX_TRACKING_TRAIL_POINTS);

    const result = mergeTrackingPoints(persisted, [persisted[10], newest]);

    expect(result).toHaveLength(MAX_TRACKING_TRAIL_POINTS);
    expect(result[0]).toEqual(point(1));
    expect(result[result.length - 1]).toEqual(newest);
  });

  it('selects the freshest point regardless of REST/socket/trail input order', () => {
    expect(getNewestTrackingPoint([point(4), null, point(9), point(2)]))
      .toEqual(point(9));
  });

  it.each(['COMPLETED', 'CANCELLED', 'DISRUPTED'] as const)('treats %s as terminal', (status) => {
    expect(isTerminalTrackingStatus(status)).toBe(true);
  });

  it.each([403, 404])('stops periodic work for HTTP %s', (statusCode) => {
    expect(isFatalTrackingError(new ApiRequestError({
      message: 'fatal',
      code: 'TRACKING_FATAL',
      statusCode,
    }))).toBe(true);
  });

  it('promotes a fatal error from any tracking endpoint to one global stop signal', () => {
    const fatal = new ApiRequestError({
      message: 'forbidden',
      code: 'ACCESS_DENIED',
      statusCode: 403,
    });

    expect(getFatalTrackingError([
      new ApiRequestError({ message: 'temporary', code: 'TEMPORARY' }),
      null,
      fatal,
    ])).toBe(fatal);
  });

  it('loads terminal trip data once while disabling automatic polling', () => {
    expect(getTrackingExecutionPolicy({
      hasAuthenticatedUser: true,
      hasValidTripId: true,
      isFocused: true,
      isOnline: true,
      isAppActive: true,
      isTerminal: true,
    })).toEqual({
      queryEnabled: true,
      pollingEnabled: false,
    });
  });

  it('pauses all network work while backgrounded and polls a live focused trip', () => {
    expect(getTrackingExecutionPolicy({
      hasAuthenticatedUser: true,
      hasValidTripId: true,
      isFocused: true,
      isOnline: true,
      isAppActive: false,
      isTerminal: false,
    })).toEqual({ queryEnabled: false, pollingEnabled: false });

    expect(getTrackingExecutionPolicy({
      hasAuthenticatedUser: true,
      hasValidTripId: true,
      isFocused: true,
      isOnline: true,
      isAppActive: true,
      isTerminal: false,
    })).toEqual({ queryEnabled: true, pollingEnabled: true });
  });

  it.each([
    ['signed out', { hasAuthenticatedUser: false }],
    ['invalid trip', { hasValidTripId: false }],
    ['blurred', { isFocused: false }],
    ['offline', { isOnline: false }],
    ['backgrounded', { isAppActive: false }],
  ])('does not open REST or realtime work while %s', (_label, override) => {
    expect(getTrackingExecutionPolicy({
      hasAuthenticatedUser: true,
      hasValidTripId: true,
      isFocused: true,
      isOnline: true,
      isAppActive: true,
      isTerminal: false,
      ...override,
    })).toEqual({ queryEnabled: false, pollingEnabled: false });
  });

  it('returns the 5-second interval only for non-fatal live polling', () => {
    expect(getTrackingRefetchInterval(true, null, TRACKING_LATEST_POLL_MS))
      .toBe(TRACKING_LATEST_POLL_MS);
    expect(getTrackingRefetchInterval(false, null, TRACKING_LATEST_POLL_MS))
      .toBe(false);
    expect(getTrackingRefetchInterval(true, new ApiRequestError({
      message: 'not found',
      code: 'NOT_FOUND',
      statusCode: 404,
    }), TRACKING_LATEST_POLL_MS)).toBe(false);
  });

  it('uses REST latest only as socket fallback and keeps slow safety refreshes bounded', () => {
    expect(getTrackingRefetchInterval(
      false,
      null,
      TRACKING_LATEST_POLL_MS,
    )).toBe(false);
    expect(getTrackingRefetchInterval(
      true,
      null,
      TRACKING_LATEST_POLL_MS,
    )).toBe(5_000);
    expect(TRACKING_ETA_POLL_MS).toBeLessThanOrEqual(60_000);
    expect(TRACKING_TRAIL_REFRESH_MS).toBe(5 * 60_000);
  });
});
