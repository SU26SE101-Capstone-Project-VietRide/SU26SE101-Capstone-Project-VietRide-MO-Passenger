import { io, type Socket } from 'socket.io-client';
import { z } from 'zod';

import {
  WS_MAX_RECONNECT_ATTEMPTS,
  WS_RECONNECT_DELAY,
  appConfig,
} from '@shared/constants';
import { isUuid } from '@shared/utils/pathSegment';
import {
  parseTrackingPoint,
  trackingDateTimeSchema,
  trackingEtaSchema,
  type TrackingEta,
  type TrackingPoint,
} from './trackingApi';

export const TRACKING_SOCKET_PATH = '/tracking/socket.io';
export const TRACKING_JOIN_ACK_TIMEOUT_MS = 5_000;

export type TrackingRealtimeStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'fallback'
  | 'forbidden'
  | 'not_found'
  | 'inactive';

export type TrackingJoinFailure =
  | 'ACCESS_DENIED'
  | 'TRIP_NOT_FOUND'
  | 'TRACKING_TRIP_NOT_ACTIVE'
  | 'TRACKING_AUTH_UNAVAILABLE'
  | 'UNAUTHORIZED'
  | 'VALIDATION_ERROR'
  | 'INVALID_ACK';

export interface TrackingEtaUpdate extends TrackingEta {
  delayed: boolean;
  delayMinutes?: number;
}

export interface TrackingDelayUpdate {
  tripId: string;
  stopId: string;
  status: 'DELAYED';
  delayMinutes: number;
  updatedAt: string;
}

interface TrackingServerEvents {
  'gps:update': (payload: unknown) => void;
  'eta:update': (payload: unknown) => void;
  'trip:statusChanged': (payload: unknown) => void;
}

interface TrackingClientEvents {
  joinTripTracking: (
    payload: { tripId: string },
    acknowledgement: (value: unknown) => void,
  ) => void;
}

interface CreateTripTrackingConnectionOptions {
  tripId: string;
  stopId?: string;
  accessToken: string;
  onStatusChange: (status: TrackingRealtimeStatus) => void;
  onGpsUpdate: (point: TrackingPoint) => void;
  onEtaUpdate: (eta: TrackingEtaUpdate) => void;
  onDelayUpdate: (delay: TrackingDelayUpdate) => void;
  onJoinRejected: (failure: TrackingJoinFailure) => void;
  onUnauthorized: () => void;
}

export interface TripTrackingConnection {
  disconnect: () => void;
}

const trackingEtaUpdateSchema = trackingEtaSchema.extend({
  delayed: z.boolean(),
  delayMinutes: z.number().int().positive().optional(),
});

const trackingDelayUpdateSchema = z.object({
  tripId: z.string().uuid(),
  stopId: z.string().uuid(),
  status: z.literal('DELAYED'),
  delayMinutes: z.number().int().positive(),
  updatedAt: trackingDateTimeSchema,
});

const joinSuccessSchema = z.object({
  success: z.literal(true),
  tripId: z.string().uuid(),
  room: z.string().min(1),
  scope: z.string().min(1),
});

const joinFailureSchema = z.object({
  success: z.literal(false),
  error: z.enum([
    'ACCESS_DENIED',
    'TRIP_NOT_FOUND',
    'TRACKING_TRIP_NOT_ACTIVE',
    'TRACKING_AUTH_UNAVAILABLE',
    'UNAUTHORIZED',
    'VALIDATION_ERROR',
  ]),
});

const joinAcknowledgementSchema = z.union([joinSuccessSchema, joinFailureSchema]);

export const resolveTrackingSocketOrigin = (publicApiBaseUrl: string): string => {
  const parsed = new URL(publicApiBaseUrl);
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('Unsupported tracking socket URL protocol.');
  }

  return parsed.origin;
};

const isUnauthorizedMessage = (value: unknown): boolean =>
  value instanceof Error && value.message === 'UNAUTHORIZED';

const realtimeStatusForJoinFailure = (
  failure: TrackingJoinFailure,
): TrackingRealtimeStatus => {
  if (failure === 'ACCESS_DENIED') return 'forbidden';
  if (failure === 'TRIP_NOT_FOUND') return 'not_found';
  if (failure === 'TRACKING_TRIP_NOT_ACTIVE') return 'inactive';
  return 'fallback';
};

export function createTripTrackingConnection({
  tripId,
  stopId,
  accessToken,
  onStatusChange,
  onGpsUpdate,
  onEtaUpdate,
  onDelayUpdate,
  onJoinRejected,
  onUnauthorized,
}: CreateTripTrackingConnectionOptions): TripTrackingConnection {
  if (!isUuid(tripId)) {
    throw new Error('Invalid tripId for realtime tracking.');
  }
  if (stopId !== undefined && !isUuid(stopId)) {
    throw new Error('Invalid stopId for realtime tracking.');
  }
  if (accessToken.trim().length === 0) {
    throw new Error('Missing access token for realtime tracking.');
  }

  let disposed = false;
  let joinAttempt = 0;
  let joinSequence = 0;
  let joinRetryTimer: ReturnType<typeof setTimeout> | undefined;
  let currentStatus: TrackingRealtimeStatus = 'idle';

  const notifyStatus = (status: TrackingRealtimeStatus): void => {
    if (disposed || status === currentStatus) return;
    currentStatus = status;
    onStatusChange(status);
  };

  const socket: Socket<TrackingServerEvents, TrackingClientEvents> = io(
    resolveTrackingSocketOrigin(appConfig.apiBaseUrl),
    {
      path: TRACKING_SOCKET_PATH,
      transports: ['websocket'],
      auth: { token: accessToken },
      autoConnect: false,
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: WS_MAX_RECONNECT_ATTEMPTS,
      reconnectionDelay: WS_RECONNECT_DELAY,
      timeout: TRACKING_JOIN_ACK_TIMEOUT_MS,
    },
  );

  const clearJoinRetry = (): void => {
    if (joinRetryTimer !== undefined) {
      clearTimeout(joinRetryTimer);
      joinRetryTimer = undefined;
    }
  };

  const scheduleJoinRetry = (requestJoin: () => void): void => {
    notifyStatus('fallback');
    if (disposed) return;
    if (joinAttempt >= WS_MAX_RECONNECT_ATTEMPTS) {
      socket.disconnect();
      return;
    }
    clearJoinRetry();
    joinRetryTimer = setTimeout(requestJoin, WS_RECONNECT_DELAY);
  };

  const requestJoin = (): void => {
    if (disposed || !socket.connected) return;
    clearJoinRetry();
    joinAttempt += 1;
    const requestSequence = ++joinSequence;
    notifyStatus('connecting');

    socket
      .timeout(TRACKING_JOIN_ACK_TIMEOUT_MS)
      .emit('joinTripTracking', { tripId }, (timeoutError, value) => {
        if (disposed || requestSequence !== joinSequence) return;
        if (timeoutError) {
          scheduleJoinRetry(requestJoin);
          return;
        }

        const parsed = joinAcknowledgementSchema.safeParse(value);
        if (!parsed.success) {
          onJoinRejected('INVALID_ACK');
          scheduleJoinRetry(requestJoin);
          return;
        }

        if (parsed.data.success) {
          if (parsed.data.tripId !== tripId) {
            onJoinRejected('INVALID_ACK');
            scheduleJoinRetry(requestJoin);
            return;
          }
          joinAttempt = 0;
          notifyStatus('connected');
          return;
        }

        const failure = parsed.data.error;
        onJoinRejected(failure);
        if (failure === 'UNAUTHORIZED') {
          onUnauthorized();
          socket.disconnect();
          return;
        }
        if (
          failure === 'TRACKING_AUTH_UNAVAILABLE'
          || failure === 'VALIDATION_ERROR'
        ) {
          scheduleJoinRetry(requestJoin);
          return;
        }

        notifyStatus(realtimeStatusForJoinFailure(failure));
        socket.disconnect();
      });
  };

  socket.on('connect', () => {
    joinAttempt = 0;
    requestJoin();
  });

  socket.on('disconnect', () => {
    joinSequence += 1;
    clearJoinRetry();
    if (
      !disposed
      && currentStatus !== 'forbidden'
      && currentStatus !== 'not_found'
      && currentStatus !== 'inactive'
    ) {
      notifyStatus('fallback');
    }
  });

  socket.on('connect_error', (error) => {
    if (isUnauthorizedMessage(error)) {
      onUnauthorized();
      socket.disconnect();
      return;
    }
    notifyStatus('fallback');
  });

  socket.io.on('reconnect_attempt', () => {
    notifyStatus('connecting');
  });

  socket.on('gps:update', (value) => {
    const point = parseTrackingPoint(value);
    if (point?.tripId === tripId) onGpsUpdate(point);
  });

  socket.on('eta:update', (value) => {
    const parsed = trackingEtaUpdateSchema.safeParse(value);
    if (!parsed.success || parsed.data.tripId !== tripId) return;
    if (stopId !== undefined && parsed.data.stopId !== stopId) return;
    onEtaUpdate(parsed.data);
  });

  socket.on('trip:statusChanged', (value) => {
    const parsed = trackingDelayUpdateSchema.safeParse(value);
    if (parsed.success && parsed.data.tripId === tripId) {
      onDelayUpdate(parsed.data);
    }
  });

  notifyStatus('connecting');
  socket.connect();

  return {
    disconnect: () => {
      if (disposed) return;
      disposed = true;
      joinSequence += 1;
      clearJoinRetry();
      socket.removeAllListeners();
      socket.io.removeAllListeners();
      socket.disconnect();
    },
  };
}
