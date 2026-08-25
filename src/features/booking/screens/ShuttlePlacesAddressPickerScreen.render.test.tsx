const mockGoBack = jest.fn();
const mockFindPredictions = jest.fn();
const mockResolvePlaceDetails = jest.fn();
const mockCancelSearch = jest.fn();
const mockCancelPendingRequests = jest.fn();
const mockSetSelectedShuttlePickup = jest.fn();
const mockSetSelectedShuttleDropoff = jest.fn();
const mockTranslate = (key: string): string =>
  key === 'booking.shuttlePicker.providerAttribution'
    ? 'Powered by Goong'
    : key;

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
  useRoute: () => ({
    params: {
      leg: 'outbound',
      direction: 'pickup',
      stationId: 'station-1',
      stationName: 'Bến xe trung tâm',
      stationLatitude: 10.772,
      stationLongitude: 106.698,
    },
  }),
}));

jest.mock('@shopify/flash-list', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    FlashList: ({ data, keyExtractor, renderItem }: {
      data: unknown[];
      keyExtractor: (item: unknown) => string;
      renderItem: (info: { item: unknown; index: number }) => React.ReactNode;
    }) => React.createElement(
      View,
      { testID: 'places-results' },
      data.map((item, index) => React.createElement(
        View,
        { key: keyExtractor(item) },
        renderItem({ item, index }),
      )),
    ),
  };
});

jest.mock('react-native-keyboard-controller', () => {
  const { View } = require('react-native');
  return { KeyboardAvoidingView: View };
}, { virtual: true });

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View };
});

jest.mock('phosphor-react-native', () => ({
  ArrowLeft: () => null,
  CheckCircle: () => null,
  MagnifyingGlass: () => null,
  MapPin: () => null,
  X: () => null,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: mockTranslate,
  }),
}));

jest.mock('zustand/react/shallow', () => ({
  useShallow: (selector: unknown) => selector,
}));

jest.mock('@shared/constants/config', () => ({
  appConfig: { goongPlacesEnabled: true },
}));

jest.mock('@shared/contexts/ThemeContext', () => ({
  useTheme: () => ({
    isDark: false,
    colors: {
      background: '#fff',
      divider: '#ddd',
      error: '#c00',
      primary: '#067',
      success: '#080',
      surface: '#fff',
      surfaceAlt: '#eee',
      textPrimary: '#111',
      textSecondary: '#444',
      textTertiary: '#777',
    },
  }),
}));

jest.mock('@shared/hooks', () => {
  const React = require('react');
  const theme = {
    colors: {
      background: '#fff',
      divider: '#ddd',
      error: '#c00',
      primary: '#067',
      success: '#080',
      surface: '#fff',
      surfaceAlt: '#eee',
      textPrimary: '#111',
      textSecondary: '#444',
      textTertiary: '#777',
    },
  };
  return {
    useDebounce: (value: unknown, delay: number) => {
      const [debounced, setDebounced] = React.useState(value);
      React.useEffect(() => {
        const timeout = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(timeout);
      }, [delay, value]);
      return debounced;
    },
    useThemedStyles: (factory: (value: unknown) => unknown) => factory(theme),
  };
});

jest.mock('@shared/places', () => ({
  isPlacesRequestAborted: (error: { code?: string } | null) =>
    error?.code === 'ABORTED',
  isPlacesRequestError: (error: { code?: string } | null) =>
    typeof error?.code === 'string',
  usePlacesSearch: () => ({
    cancelPendingRequests: mockCancelPendingRequests,
    cancelSearch: mockCancelSearch,
    findPredictions: mockFindPredictions,
    resolvePlaceDetails: mockResolvePlaceDetails,
  }),
}));

jest.mock('../store/useBookingStore', () => ({
  useBookingStore: (selector: (state: unknown) => unknown) => selector({
    currentLeg: 'outbound',
    selectedShuttlePickup: null,
    selectedShuttleDropoff: null,
    setSelectedShuttlePickup: mockSetSelectedShuttlePickup,
    setSelectedShuttleDropoff: mockSetSelectedShuttleDropoff,
  }),
}));

import React from 'react';
import { Text, TextInput } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { ShuttlePlacesAddressPickerScreen } from './ShuttlePlacesAddressPickerScreen';

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(resolvePromise => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
};

const renderScreen = async (): Promise<ReactTestRenderer.ReactTestRenderer> => {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(<ShuttlePlacesAddressPickerScreen />);
  });
  return renderer;
};

const advanceDebounce = async (milliseconds = 280): Promise<void> => {
  await act(async () => {
    jest.advanceTimersByTime(milliseconds);
    await Promise.resolve();
    await Promise.resolve();
  });
};

const renderedText = (
  renderer: ReactTestRenderer.ReactTestRenderer,
): string[] => renderer.root.findAllByType(Text)
  .flatMap(node => node.props.children)
  .filter((value): value is string => typeof value === 'string');

const findPressableByLabel = (
  renderer: ReactTestRenderer.ReactTestRenderer,
  label: string,
): ReactTestRenderer.ReactTestInstance | undefined => renderer.root.findAll(
  node => node.props.accessibilityLabel === label
    && typeof node.props.onPress === 'function',
)[0];

describe('ShuttlePlacesAddressPickerScreen rendered Goong flow', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockFindPredictions.mockReset().mockResolvedValue([
      {
        placeId: 'goong-place-1',
        primaryText: 'Bến Thành',
        secondaryText: 'Quận 1',
        fullText: 'Bến Thành, Quận 1',
      },
    ]);
    mockResolvePlaceDetails.mockReset().mockResolvedValue({
      provider: 'goong',
      placeId: 'goong-place-1',
      displayName: 'Chợ Bến Thành',
      formattedAddress: 'Lê Lợi, Quận 1, Hồ Chí Minh',
      latitude: 10.773,
      longitude: 106.699,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('debounces, searches with the locked station bias, and stores no provider metadata', async () => {
    const renderer = await renderScreen();
    const input = renderer.root.findByType(TextInput);

    act(() => input.props.onChangeText('Be'));
    await advanceDebounce();
    expect(mockFindPredictions).not.toHaveBeenCalled();

    act(() => input.props.onChangeText('Ben Thanh'));
    await advanceDebounce(279);
    expect(mockFindPredictions).not.toHaveBeenCalled();

    await advanceDebounce(1);
    expect(mockFindPredictions).toHaveBeenCalledWith({
      query: 'Ben Thanh',
      location: { latitude: 10.772, longitude: 106.698 },
      radiusMeters: 10_000,
      maxResults: 5,
    });

    expect(renderedText(renderer)).toContain('Powered by Goong');

    const suggestion = findPressableByLabel(renderer, 'Bến Thành. Quận 1');
    expect(suggestion).toBeDefined();
    await act(async () => {
      suggestion?.props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockResolvePlaceDetails).toHaveBeenCalledWith({
      placeId: 'goong-place-1',
    });
    expect(mockSetSelectedShuttlePickup).toHaveBeenCalledWith({
      stationId: 'station-1',
      address: 'Chợ Bến Thành, Lê Lợi, Quận 1, Hồ Chí Minh',
      latitude: 10.773,
      longitude: 106.699,
    });
    const storedDraft = mockSetSelectedShuttlePickup.mock.calls[0][0];
    expect(storedDraft).not.toHaveProperty('placeId');
    expect(storedDraft).not.toHaveProperty('provider');
    expect(mockSetSelectedShuttleDropoff).not.toHaveBeenCalled();
    expect(mockGoBack).toHaveBeenCalledTimes(1);

    await act(async () => renderer.unmount());
  });

  it('clears pending input and does not search the cleared query', async () => {
    const renderer = await renderScreen();
    act(() => renderer.root.findByType(TextInput).props.onChangeText('Ben Thanh'));

    const clear = findPressableByLabel(
      renderer,
      'booking.shuttlePicker.clearSearch',
    );
    expect(clear).toBeDefined();
    const cancellationsBeforeClear = mockCancelPendingRequests.mock.calls.length;
    act(() => clear?.props.onPress());

    expect(renderer.root.findByType(TextInput).props.value).toBe('');
    expect(mockCancelPendingRequests.mock.calls.length).toBeGreaterThan(
      cancellationsBeforeClear,
    );
    await advanceDebounce();
    expect(mockFindPredictions).not.toHaveBeenCalled();
    await act(async () => renderer.unmount());
  });

  it('ignores a stale autocomplete response after a newer query wins', async () => {
    const first = deferred<Array<{
      placeId: string;
      primaryText: string;
      secondaryText: string;
      fullText: string;
    }>>();
    const second = deferred<Array<{
      placeId: string;
      primaryText: string;
      secondaryText: string;
      fullText: string;
    }>>();
    mockFindPredictions
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const renderer = await renderScreen();

    act(() => renderer.root.findByType(TextInput).props.onChangeText('Ben Thanh'));
    await advanceDebounce();
    act(() => renderer.root.findByType(TextInput).props.onChangeText('Cho Lon'));
    await advanceDebounce();

    await act(async () => {
      second.resolve([{
        placeId: 'new-place',
        primaryText: 'Chợ Lớn',
        secondaryText: 'Quận 5',
        fullText: 'Chợ Lớn, Quận 5',
      }]);
      await Promise.resolve();
    });
    await act(async () => {
      first.resolve([{
        placeId: 'stale-place',
        primaryText: 'Kết quả cũ',
        secondaryText: 'Không được hiển thị',
        fullText: 'Kết quả cũ, Không được hiển thị',
      }]);
      await Promise.resolve();
    });

    const labels = renderer.root.findAll(
      node => typeof node.props.accessibilityLabel === 'string',
    ).map(node => node.props.accessibilityLabel);
    expect(labels).toContain('Chợ Lớn. Quận 5');
    expect(labels).not.toContain('Kết quả cũ. Không được hiển thị');
    await act(async () => renderer.unmount());
  });

  it('keeps the selected row and input disabled while place detail resolves', async () => {
    const detail = deferred<{
      provider: 'goong';
      placeId: string;
      displayName: string;
      formattedAddress: string;
      latitude: number;
      longitude: number;
    }>();
    mockResolvePlaceDetails.mockReturnValue(detail.promise);
    const renderer = await renderScreen();
    act(() => renderer.root.findByType(TextInput).props.onChangeText('Ben Thanh'));
    await advanceDebounce();

    const initialRow = findPressableByLabel(renderer, 'Bến Thành. Quận 1');
    await act(async () => {
      initialRow?.props.onPress();
      await Promise.resolve();
    });

    const busyRow = findPressableByLabel(renderer, 'Bến Thành. Quận 1');
    expect(busyRow?.props.disabled).toBe(true);
    expect(busyRow?.props.accessibilityState).toEqual({ busy: true, disabled: true });
    expect(renderer.root.findByType(TextInput).props.editable).toBe(false);

    await act(async () => {
      detail.resolve({
        provider: 'goong',
        placeId: 'goong-place-1',
        displayName: 'Chợ Bến Thành',
        formattedAddress: 'Lê Lợi, Quận 1, Hồ Chí Minh',
        latitude: 10.773,
        longitude: 106.699,
      });
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(mockSetSelectedShuttlePickup).toHaveBeenCalledTimes(1);
    await act(async () => renderer.unmount());
  });

  it('does not save stale place details after clearing a pending selection', async () => {
    const detail = deferred<{
      provider: 'goong';
      placeId: string;
      displayName: string;
      formattedAddress: string;
      latitude: number;
      longitude: number;
    }>();
    mockResolvePlaceDetails.mockReturnValue(detail.promise);
    const renderer = await renderScreen();
    act(() => renderer.root.findByType(TextInput).props.onChangeText('Ben Thanh'));
    await advanceDebounce();

    const row = findPressableByLabel(renderer, 'Bến Thành. Quận 1');
    await act(async () => {
      row?.props.onPress();
      await Promise.resolve();
    });
    expect(mockResolvePlaceDetails).toHaveBeenCalledTimes(1);

    const clear = findPressableByLabel(
      renderer,
      'booking.shuttlePicker.clearSearch',
    );
    const cancellationsBeforeClear = mockCancelPendingRequests.mock.calls.length;
    act(() => clear?.props.onPress());

    expect(mockCancelPendingRequests.mock.calls.length).toBeGreaterThan(
      cancellationsBeforeClear,
    );
    expect(renderer.root.findByType(TextInput).props.value).toBe('');
    expect(renderer.root.findByType(TextInput).props.editable).toBe(true);

    await act(async () => {
      detail.resolve({
        provider: 'goong',
        placeId: 'goong-place-1',
        displayName: 'Chợ Bến Thành',
        formattedAddress: 'Lê Lợi, Quận 1, Hồ Chí Minh',
        latitude: 10.773,
        longitude: 106.699,
      });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockSetSelectedShuttlePickup).not.toHaveBeenCalled();
    expect(mockSetSelectedShuttleDropoff).not.toHaveBeenCalled();
    expect(mockGoBack).not.toHaveBeenCalled();
    await act(async () => renderer.unmount());
  });

  it('maps autocomplete and detail failures to existing user-facing error states', async () => {
    mockFindPredictions.mockRejectedValueOnce({ code: 'OFFLINE' });
    const renderer = await renderScreen();
    act(() => renderer.root.findByType(TextInput).props.onChangeText('Ben Thanh'));
    await advanceDebounce();
    expect(renderedText(renderer)).toContain('booking.shuttlePicker.errors.offline');

    mockFindPredictions.mockResolvedValueOnce([{
      placeId: 'invalid-place',
      primaryText: 'Địa điểm lỗi',
      secondaryText: 'Quận 1',
      fullText: 'Địa điểm lỗi, Quận 1',
    }]);
    mockResolvePlaceDetails.mockRejectedValueOnce({ code: 'INVALID_PLACE' });
    act(() => renderer.root.findByType(TextInput).props.onChangeText('Dia diem loi'));
    await advanceDebounce();
    const row = findPressableByLabel(renderer, 'Địa điểm lỗi. Quận 1');
    await act(async () => {
      row?.props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(renderedText(renderer)).toContain(
      'booking.shuttlePicker.errors.invalidPlace',
    );
    expect(mockSetSelectedShuttlePickup).not.toHaveBeenCalled();
    await act(async () => renderer.unmount());
  });
});
