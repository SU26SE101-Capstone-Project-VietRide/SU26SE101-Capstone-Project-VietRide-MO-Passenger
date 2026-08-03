import { io, type Socket } from 'socket.io-client';
import { z } from 'zod';

import {
  WS_MAX_RECONNECT_ATTEMPTS,
  WS_RECONNECT_DELAY,
  appConfig,
} from '@shared/constants';
import { isUuid } from '@shared/utils/pathSegment';
import {
  parseShuttleTrackingEta,
  parseShuttleTrackingPoint,
  parseTrackingPoint,
  type ShuttleTrackingEta,
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
  | 'SHUTTLE_TRIP_NOT_FOUND'
  | 'TRACKING_TRIP_NOT_ACTIVE'
  | 'TRACKING_AUTH_UNAVAILABLE'
  | 'TRACKING_CONTEXT_UNAVAILABLE'
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
  'shuttle:gps:update': (payload: unknown) => void;
  'shuttle:eta:update': (payload: unknown) => void;
}

interface TrackingClientEvents {
  joinTripTracking: (
    payload: { tripId: string },
    acknowledgement: (value: unknown) => void,
  ) => void;
  joinShuttleTracking: (
    payload: { shuttleTripId: string },
    acknowledgement: (value: unknown) => void,
  ) => void;
}

interface CreateTrackingConnectionBaseOptions {
  accessToken: string;
  onStatusChange: (status: TrackingRealtimeStatus) => void;
  onGpsUpdate: (point: TrackingPoint) => void;
  onJoinRejected: (failure: TrackingJoinFailure) => void;
  onUnauthorized: () => void;
}

interface CreateTripTrackingConnectionOptions
  extends CreateTrackingConnectionBaseOptions {
  source?: 'trip';
  tripId: string;
  /** @deprecated ETA filtering belongs to the tracking orchestration hook. */
  stopId?: string;
  onEtaUpdate: (eta: TrackingEtaUpdate) => void;
  onDelayUpdate: (delay: TrackingDelayUpdate) => void;
}

interface CreateShuttleTrackingConnectionOptions
  extends CreateTrackingConnectionBaseOptions {
  source: 'shuttle';
  shuttleTripId: string;
  onEtaUpdate: (eta: ShuttleTrackingEta) => void;
}

type CreateTrackingConnectionOptions =
  | CreateTripTrackingConnectionOptions
  | CreateShuttleTrackingConnectionOptions;

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
    'SHUTTLE_TRIP_NOT_FOUND',
    'TRACKING_TRIP_NOT_ACTIVE',
    'TRACKING_AUTH_UNAVAILABLE',
    'TRACKING_CONTEXT_UNAVAILABLE',
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
  if (failure === 'TRIP_NOT_FOUND' || failure === 'SHUTTLE_TRIP_NOT_FOUND') {
    return 'not_found';
  }
  if (failure === 'TRACKING_TRIP_NOT_ACTIVE') return 'inactive';
  return 'fallback';
};

export function createTripTrackingConnection(
  options: CreateTrackingConnectionOptions,
): TripTrackingConnection {
  const isShuttle = options.source === 'shuttle';
  const trackingId = isShuttle ? options.shuttleTripId : options.tripId;
  const {
    accessToken,
    onStatusChange,
    onGpsUpdate,
    onJoinRejected,
    onUnauthorized,
  } = options;

  if (!isUuid(trackingId)) {
    throw new Error(
      isShuttle
        ? 'Invalid shuttleTripId for realtime tracking.'
        : 'Invalid tripId for realtime tracking.',
    );
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

    const handleAcknowledgement = (
      timeoutError: Error | null,
      value: unknown,
    ): void => {
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
        // BE intentionally reuses `tripId` in both join acknowledgements.
        if (parsed.data.tripId !== trackingId) {
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
        || failure === 'TRACKING_CONTEXT_UNAVAILABLE'
        || failure === 'VALIDATION_ERROR'
      ) {
        scheduleJoinRetry(requestJoin);
        return;
      }

      notifyStatus(realtimeStatusForJoinFailure(failure));
      socket.disconnect();
    };

    const socketWithTimeout = socket.timeout(TRACKING_JOIN_ACK_TIMEOUT_MS);
    if (isShuttle) {
      socketWithTimeout.emit(
        'joinShuttleTracking',
        { shuttleTripId: trackingId },
        handleAcknowledgement,
      );
    } else {
      socketWithTimeout.emit(
        'joinTripTracking',
        { tripId: trackingId },
        handleAcknowledgement,
      );
    }
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

  if (isShuttle) {
    socket.on('shuttle:gps:update', (value) => {
      const point = parseShuttleTrackingPoint(value, trackingId);
      if (point) onGpsUpdate(point);
    });

    socket.on('shuttle:eta:update', (value) => {
      const eta = parseShuttleTrackingEta(value, trackingId);
      if (eta) options.onEtaUpdate(eta);
    });
  } else {
    socket.on('gps:update', (value) => {
      const point = parseTrackingPoint(value);
      if (point?.tripId === trackingId) onGpsUpdate(point);
    });

    socket.on('eta:update', (value) => {
      const parsed = trackingEtaUpdateSchema.safeParse(value);
      if (!parsed.success || parsed.data.tripId !== trackingId) return;
      options.onEtaUpdate(parsed.data);
    });

    socket.on('trip:statusChanged', (value) => {
      const parsed = trackingDelayUpdateSchema.safeParse(value);
      if (parsed.success && parsed.data.tripId === trackingId) {
        options.onDelayUpdate(parsed.data);
      }
    });
  }

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
