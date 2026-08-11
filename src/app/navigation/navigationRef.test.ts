const mockNavigate = jest.fn();
const mockIsReady = jest.fn();
const mockGetRootState = jest.fn();
const mockGetAuthState = jest.fn();

jest.mock('@react-navigation/native', () => ({
  createNavigationContainerRef: () => ({
    isReady: (...args: unknown[]) => mockIsReady(...args),
    getRootState: (...args: unknown[]) => mockGetRootState(...args),
    navigate: (...args: unknown[]) => mockNavigate(...args),
  }),
}));

jest.mock('@features/auth/store/useAuthStore', () => ({
  useAuthStore: {
    getState: (...args: unknown[]) => mockGetAuthState(...args),
  },
}));

import {
  discardPendingNotificationOpen,
  discardPendingPaymentOpen,
  flushPendingNotificationOpen,
  flushPendingPaymentOpen,
  openNotificationFromSystemTray,
  openPendingPaymentDestination,
} from './navigationRef';

const TRIP_ID = '05bad56c-fcb1-4b40-99e1-ae5f3b6e1759';
const SHUTTLE_TRIP_ID = '894cdd0e-1c98-42ca-9cac-f80d198ef7fe';
const BOOKING_ID = 'ce53478c-faab-47cd-a0a7-75a7f23a34d2';

describe('notification action navigation', () => {
  beforeEach(() => {
    discardPendingNotificationOpen();
    mockNavigate.mockReset();
    mockIsReady.mockReturnValue(true);
    mockGetRootState.mockReturnValue({ routeNames: ['Main', 'Tracking', 'Parcel'] });
    mockGetAuthState.mockReturnValue({
      isAuthenticated: true,
      isGuest: false,
      user: { id: BOOKING_ID, status: 'ACTIVE', phone: '+84123456789' },
    });
  });

  it('opens an allow-listed supported action directly', () => {
    openNotificationFromSystemTray({
      type: 'OPEN_TRIP_TRACKING',
      params: { tripId: TRIP_ID },
    });

    expect(mockNavigate).toHaveBeenCalledWith('Tracking', {
      source: 'trip',
      tripId: TRIP_ID,
    });
  });

  it('opens shuttle tracking with bookingId when present on the action', () => {
    openNotificationFromSystemTray({
      type: 'OPEN_SHUTTLE_TRACKING',
      params: { shuttleTripId: SHUTTLE_TRIP_ID, bookingId: BOOKING_ID },
    });

    expect(mockNavigate).toHaveBeenCalledWith('Tracking', {
      source: 'shuttle',
      shuttleTripId: SHUTTLE_TRIP_ID,
      bookingId: BOOKING_ID,
    });
  });

  it('opens the inbox for a validated but unsupported Passenger action', () => {
    openNotificationFromSystemTray({
      type: 'OPEN_TRIP_DETAIL',
      params: { tripId: TRIP_ID },
    });

    expect(mockNavigate).toHaveBeenCalledWith('Main', { screen: 'Notification' });
  });

  it('waits for navigation readiness before opening', () => {
    mockIsReady.mockReturnValue(false);
    openNotificationFromSystemTray({ type: 'OPEN_WALLET', params: {} });
    expect(mockNavigate).not.toHaveBeenCalled();

    mockIsReady.mockReturnValue(true);
    flushPendingNotificationOpen();

    expect(mockNavigate).toHaveBeenCalledWith('Main', {
      screen: 'Profile',
      params: { screen: 'Wallet' },
    });
  });

  it('discards pending navigation during logout cleanup', () => {
    mockIsReady.mockReturnValue(false);
    openNotificationFromSystemTray({ type: 'OPEN_WALLET', params: {} });

    discardPendingNotificationOpen();
    mockIsReady.mockReturnValue(true);
    flushPendingNotificationOpen();

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('opens a cold parcel payment only for its owner', () => {
    openPendingPaymentDestination({
      sessionId: 'payment-1',
      kind: 'parcel_final',
      businessId: 'parcel-1',
      ownerUserId: BOOKING_ID,
      createdAt: '2026-08-11T00:00:00.000Z',
      paymentRedirectUrl: 'https://sandbox.vnpayment.vn/pay',
      vnpaySdk: {
        tmnCode: 'TMN',
        scheme: 'vietride',
        isSandbox: true,
      },
    });

    expect(mockNavigate).toHaveBeenCalledWith('Parcel', {
      screen: 'ParcelDetail',
      params: { parcelId: 'parcel-1', fromHistory: true },
    });
    discardPendingPaymentOpen();
    flushPendingPaymentOpen();
  });
});
