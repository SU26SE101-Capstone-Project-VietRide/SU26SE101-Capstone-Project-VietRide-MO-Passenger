import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';

const mockTheme = {
  colors: {
    background: '#F7FAF9',
    surface: '#FFFFFF',
    surfaceAlt: '#F1F6F5',
    primary: '#007D78',
    primaryFaded: '#DDF3F1',
    textPrimary: '#10201F',
    textSecondary: '#435A57',
    textTertiary: '#70817F',
    textDisabled: '#A9B5B3',
    textInverse: '#FFFFFF',
    divider: '#DDE5E3',
    border: '#C8D4D2',
    error: '#B3261E',
    errorLight: '#FCE8E6',
    success: '#007D56',
  },
  effects: {
    isLiquid: false,
    glassSurfaceStrong: '#FFFFFF',
    glassSurfaceSoft: '#F1F6F5',
    glassBorder: '#DDE5E3',
    glassBorderStrong: '#C8D4D2',
    cardShadow: {},
  },
  components: {
    headerButton: {},
  },
};

const mockLiveTripTrackingPanel = jest.fn((_props: unknown) => null);
const mockUseParcelDetail = jest.fn();
const mockRefetch = jest.fn(async () => undefined);

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn() }),
  useRoute: () => ({ params: { parcelId: 'parcel-1' } }),
}));

jest.mock('@shared/contexts/ThemeContext', () => ({
  useTheme: () => mockTheme,
}));

jest.mock('@shared/hooks', () => ({
  useThemedStyles: (factory: (theme: typeof mockTheme) => unknown) => factory(mockTheme),
}));

jest.mock('phosphor-react-native', () => {
  const MockIcon = () => null;
  return {
    ArrowLeft: MockIcon,
    CheckCircle: MockIcon,
    Package: MockIcon,
    Truck: MockIcon,
    WarningCircle: MockIcon,
  };
});

jest.mock('@features/tracking', () => ({
  LiveTripTrackingPanel: (props: unknown) => mockLiveTripTrackingPanel(props),
}));

jest.mock('../hooks/useParcelQueries', () => ({
  useParcelDetail: () => mockUseParcelDetail(),
}));

jest.mock('../components', () => ({
  ErrorView: () => null,
}));

import { ParcelTrackingScreen } from './ParcelTrackingScreen';

const tripId = '11111111-1111-4111-8111-111111111111';
const stopId = '22222222-2222-4222-8222-222222222222';

const parcel = {
  parcelId: 'parcel-1',
  parcelCode: 'PRC-001',
  status: 'IN_TRANSIT',
  tripId,
  dropoffStopId: stopId,
  originStationName: 'Ho Chi Minh City',
  destinationStationName: 'Da Nang',
  createdAt: '2026-07-20T05:00:00.000Z',
  loadedAt: '2026-07-20T06:00:00.000Z',
  unloadedAt: null,
  deliveredPendingConfirmAt: null,
  confirmedAt: null,
  rejectedAt: null,
  eta: null,
};

const parcelQuery = (data = parcel) => ({
  data,
  error: null,
  isError: false,
  isLoading: false,
  isRefetching: false,
  refetch: mockRefetch,
});

describe('ParcelTrackingScreen live map integration', () => {
  beforeEach(() => {
    mockLiveTripTrackingPanel.mockClear();
    mockUseParcelDetail.mockReset();
    mockUseParcelDetail.mockReturnValue(parcelQuery());
  });

  it('maps parcel detail identifiers into the shared trip tracking panel', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = ReactTestRenderer.create(<ParcelTrackingScreen />);
    });

    expect(mockLiveTripTrackingPanel).toHaveBeenCalledWith({
      tripId,
      stopId,
      sourceTerminal: false,
      terminalMessage: 'Parcel transport is complete. Automatic location updates are stopped.',
    });

    await act(async () => renderer!.unmount());
  });

  it('does not call Tracking while Parcel BE has not authorized that status', async () => {
    mockUseParcelDetail.mockReturnValue(parcelQuery({
      ...parcel,
      status: 'PENDING_PAYMENT',
    }));
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = ReactTestRenderer.create(<ParcelTrackingScreen />);
    });

    expect(mockLiveTripTrackingPanel).not.toHaveBeenCalled();

    await act(async () => renderer!.unmount());
  });
});
