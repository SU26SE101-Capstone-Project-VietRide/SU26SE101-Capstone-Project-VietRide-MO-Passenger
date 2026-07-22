jest.mock('@shared/constants', () => ({
  appConfig: { apiBaseUrl: 'https://api.vietride.online/v1' },
  WS_MAX_RECONNECT_ATTEMPTS: 5,
  WS_RECONNECT_DELAY: 3_000,
}));
jest.mock('@shared/api/axiosInstance', () => ({
  apiClient: { get: jest.fn() },
}));
jest.mock('socket.io-client', () => ({
  io: jest.fn(),
}));

import { io } from 'socket.io-client';
import {
  TRACKING_SOCKET_PATH,
  createTripTrackingConnection,
  resolveTrackingSocketOrigin,
  type TrackingDelayUpdate,
  type TrackingEtaUpdate,
  type TrackingRealtimeStatus,
} from './trackingRealtime';
import type { TrackingPoint } from './trackingApi';

const TRIP_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_TRIP_ID = '22222222-2222-4222-8222-222222222222';
const STOP_ID = '33333333-3333-4333-8333-333333333333';

type EventHandler = (...args: unknown[]) => void;

interface FakeSocket {
  connected: boolean;
  handlers: Map<string, EventHandler>;
  managerHandlers: Map<string, EventHandler>;
  on: jest.Mock;
  emit: jest.Mock;
  timeout: jest.Mock;
  connect: jest.Mock;
  disconnect: jest.Mock;
  removeAllListeners: jest.Mock;
  io: {
    on: jest.Mock;
    removeAllListeners: jest.Mock;
  };
}

const createFakeSocket = (): FakeSocket => {
  const handlers = new Map<string, EventHandler>();
  const managerHandlers = new Map<string, EventHandler>();
  const socket = {
    connected: false,
    handlers,
    managerHandlers,
  } as FakeSocket;
  socket.on = jest.fn((event: string, handler: EventHandler) => {
    handlers.set(event, handler);
    return socket;
  });
  socket.emit = jest.fn(() => socket);
  socket.timeout = jest.fn(() => socket);
  socket.connect = jest.fn(() => socket);
  socket.disconnect = jest.fn(() => {
    socket.connected = false;
    return socket;
  });
  socket.removeAllListeners = jest.fn(() => socket);
  socket.io = {
    on: jest.fn((event: string, handler: EventHandler) => {
      managerHandlers.set(event, handler);
      return socket.io;
    }),
    removeAllListeners: jest.fn(() => socket.io),
  };
  return socket;
};

const fire = (
  handlers: Map<string, EventHandler>,
  event: string,
  ...args: unknown[]
): void => {
  const handler = handlers.get(event);
  if (!handler) throw new Error(`Missing fake handler for ${event}`);
  handler(...args);
};

describe('tracking realtime connection', () => {
  const ioMock = jest.mocked(io);
  let socket: FakeSocket;
  let statuses: TrackingRealtimeStatus[];
  let gpsUpdates: TrackingPoint[];
  let etaUpdates: TrackingEtaUpdate[];
  let delayUpdates: TrackingDelayUpdate[];
  let onUnauthorized: jest.Mock;
  let onJoinRejected: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    socket = createFakeSocket();
    ioMock.mockReturnValue(socket as never);
    statuses = [];
    gpsUpdates = [];
    etaUpdates = [];
    delayUpdates = [];
    onUnauthorized = jest.fn();
    onJoinRejected = jest.fn();
  });

  const connect = () => createTripTrackingConnection({
    tripId: TRIP_ID,
    stopId: STOP_ID,
    accessToken: 'private-access-token',
    onStatusChange: (status) => statuses.push(status),
    onGpsUpdate: (point) => gpsUpdates.push(point),
    onEtaUpdate: (eta) => etaUpdates.push(eta),
    onDelayUpdate: (delay) => delayUpdates.push(delay),
    onJoinRejected,
    onUnauthorized,
  });

  it('uses the public API origin and keeps the access token out of the query', () => {
    connect();

    expect(resolveTrackingSocketOrigin('https://api.vietride.online/v1'))
      .toBe('https://api.vietride.online');
    expect(ioMock).toHaveBeenCalledWith(
      'https://api.vietride.online',
      expect.objectContaining({
        path: TRACKING_SOCKET_PATH,
        transports: ['websocket'],
        auth: { token: 'private-access-token' },
        autoConnect: false,
      }),
    );
    const options = ioMock.mock.calls[0]?.[1];
    expect(options).not.toHaveProperty('query');
  });

  it('joins the authorized trip after every socket connection', () => {
    connect();
    socket.connected = true;

    fire(socket.handlers, 'connect');
    const firstAck = socket.emit.mock.calls[0]?.[2] as EventHandler;
    firstAck(null, {
      success: true,
      tripId: TRIP_ID,
      room: `trip:${TRIP_ID}`,
      scope: 'BOOKING_OWNER',
    });
    fire(socket.handlers, 'disconnect', 'transport close');
    socket.connected = true;
    fire(socket.handlers, 'connect');

    expect(socket.emit).toHaveBeenCalledTimes(2);
    expect(socket.emit).toHaveBeenNthCalledWith(
      1,
      'joinTripTracking',
      { tripId: TRIP_ID },
      expect.any(Function),
    );
    expect(socket.emit).toHaveBeenNthCalledWith(
      2,
      'joinTripTracking',
      { tripId: TRIP_ID },
      expect.any(Function),
    );
    expect(statuses).toContain('connected');
  });

  it('validates and trip-filters every server event before forwarding it', () => {
    connect();
    const recordedAt = '2026-07-20T08:00:00.000Z';
    const validPoint = {
      tripId: TRIP_ID,
      latitude: 10.762622,
      longitude: 106.660172,
      speedKmh: 42,
      headingDeg: 90,
      recordedAt,
    };

    fire(socket.handlers, 'gps:update', { ...validPoint, latitude: 120 });
    fire(socket.handlers, 'gps:update', { ...validPoint, tripId: OTHER_TRIP_ID });
    fire(socket.handlers, 'gps:update', validPoint);
    fire(socket.handlers, 'eta:update', {
      tripId: TRIP_ID,
      stopId: OTHER_TRIP_ID,
      etaMinutes: 12,
      estimatedArrivalTime: '2026-07-20T08:12:00.000Z',
      distanceMeters: 8_000,
      updatedAt: recordedAt,
      delayed: false,
    });
    fire(socket.handlers, 'eta:update', {
      tripId: TRIP_ID,
      stopId: STOP_ID,
      etaMinutes: 12,
      estimatedArrivalTime: '2026-07-20T08:12:00.000Z',
      distanceMeters: 8_000,
      updatedAt: recordedAt,
      delayed: false,
    });
    fire(socket.handlers, 'trip:statusChanged', {
      tripId: OTHER_TRIP_ID,
      stopId: STOP_ID,
      status: 'DELAYED',
      delayMinutes: 35,
      updatedAt: recordedAt,
    });
    fire(socket.handlers, 'trip:statusChanged', {
      tripId: TRIP_ID,
      stopId: STOP_ID,
      status: 'DELAYED',
      delayMinutes: 35,
      updatedAt: recordedAt,
    });

    expect(gpsUpdates).toEqual([validPoint]);
    expect(etaUpdates).toHaveLength(1);
    expect(delayUpdates).toHaveLength(1);
  });

  it('maps authorization rejection to a fatal realtime state', () => {
    connect();
    socket.connected = true;
    fire(socket.handlers, 'connect');
    const acknowledgement = socket.emit.mock.calls[0]?.[2] as EventHandler;

    acknowledgement(null, { success: false, error: 'ACCESS_DENIED' });

    expect(onJoinRejected).toHaveBeenCalledWith('ACCESS_DENIED');
    expect(statuses).toContain('forbidden');
    expect(socket.disconnect).toHaveBeenCalled();
  });

  it('delegates an unauthorized handshake to the shared refresh flow', () => {
    connect();

    fire(socket.handlers, 'connect_error', new Error('UNAUTHORIZED'));

    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(socket.disconnect).toHaveBeenCalled();
  });

  it('rejects invalid identifiers before opening a socket', () => {
    expect(() => createTripTrackingConnection({
      tripId: 'not-a-uuid',
      accessToken: 'private-access-token',
      onStatusChange: jest.fn(),
      onGpsUpdate: jest.fn(),
      onEtaUpdate: jest.fn(),
      onDelayUpdate: jest.fn(),
      onJoinRejected: jest.fn(),
      onUnauthorized: jest.fn(),
    })).toThrow('Invalid tripId');
    expect(ioMock).not.toHaveBeenCalled();
  });
});
