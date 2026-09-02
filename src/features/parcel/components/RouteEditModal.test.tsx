import React from 'react';
import { StyleSheet } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { RouteEditModal } from './RouteEditModal';

const mockTheme = {
  colors: {
    primary: '#007d78',
    primaryDark: '#005f5b',
    primaryFaded: '#e3f5f3',
    accent: '#f59e0b',
    accentLight: '#fef3c7',
    background: '#ffffff',
    surface: '#ffffff',
    surfaceAlt: '#f4f7f7',
    textPrimary: '#111827',
    textSecondary: '#6b7280',
    border: '#e5e7eb',
    divider: '#f3f4f6',
  },
  components: {
    card: {
      backgroundColor: '#ffffff',
    },
  },
};

jest.mock('react-i18next', () => {
  const translations: Record<string, string> = {
    'parcel.route.changeOrigin': 'Đổi khu vực gửi',
    'parcel.route.changeDestination': 'Đổi khu vực nhận',
    'parcel.route.swap': 'Đổi chiều gửi / nhận',
  };
  return {
    useTranslation: () => ({
      t: (key: string, options?: { defaultValue?: string }) =>
        translations[key] ?? options?.defaultValue ?? key,
    }),
  };
});
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 20, left: 0 }),
}));
jest.mock('@shared/contexts/ThemeContext', () => ({
  useTheme: () => mockTheme,
}));
jest.mock('@shared/hooks', () => ({
  useThemedStyles: (factory: (theme: typeof mockTheme) => unknown) =>
    factory(mockTheme),
}));
jest.mock('phosphor-react-native', () => ({
  ArrowsDownUp: () => null,
  MapPin: () => null,
  PencilSimple: () => null,
  X: () => null,
}));

describe('RouteEditModal', () => {
  it('renders origin, destination, swap and handles callbacks', () => {
    const onClose = jest.fn();
    const onEditFrom = jest.fn();
    const onEditTo = jest.fn();
    const onSwap = jest.fn();

    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    act(() => {
      renderer = ReactTestRenderer.create(
        <RouteEditModal
          visible={true}
          onClose={onClose}
          fromCity="TP. Hồ Chí Minh"
          toCity="Vũng Tàu"
          onEditFrom={onEditFrom}
          onEditTo={onEditTo}
          onSwap={onSwap}
        />,
      );
    });

    const originBtn = renderer!.root.findByProps({
      accessibilityLabel: 'Đổi khu vực gửi: TP. Hồ Chí Minh',
    });
    act(() => {
      originBtn.props.onPress();
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onEditFrom).toHaveBeenCalledTimes(1);

    const destBtn = renderer!.root.findByProps({
      accessibilityLabel: 'Đổi khu vực nhận: Vũng Tàu',
    });
    act(() => {
      destBtn.props.onPress();
    });
    expect(onClose).toHaveBeenCalledTimes(2);
    expect(onEditTo).toHaveBeenCalledTimes(1);

    const swapBtn = renderer!.root.findByProps({
      accessibilityLabel: 'Đổi chiều gửi / nhận',
    });
    const swapButtonStyle =
      typeof swapBtn.props.style === 'function'
        ? swapBtn.props.style({ pressed: false })
        : swapBtn.props.style;
    expect(StyleSheet.flatten(swapButtonStyle)).toMatchObject({
      minHeight: 44,
    });
    act(() => {
      swapBtn.props.onPress();
    });
    expect(onSwap).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(3);
  });
});
