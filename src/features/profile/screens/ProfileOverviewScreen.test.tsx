import React from 'react';
import { StyleSheet } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

const mockTheme = {
  isDark: false,
  colors: {
    transparent: 'transparent',
    background: '#F7FAF9',
    surface: '#FFFFFF',
    surfaceAlt: '#F1F6F5',
    primary: '#007D78',
    primaryFaded: '#DDF3F1',
    textPrimary: '#10201F',
    textSecondary: '#435A57',
    textTertiary: '#70817F',
    divider: '#DDE5E3',
    error: '#B3261E',
    success: '#007D56',
    warning: '#A46000',
    warningLight: '#FFF2D6',
  },
  components: {
    screen: {},
    elevatedCard: {},
    card: {},
    dangerButton: {},
    secondaryButton: {},
  },
};

let mockAuthState = {
  user: {
    fullName: 'Nguyễn Văn An',
    phone: '0900000000',
    email: 'an@example.com',
    status: 'ACTIVE',
  },
  logout: jest.fn(async () => undefined),
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('react-native-safe-area-context', () => {
  const ReactModule = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    SafeAreaView: (props: Record<string, unknown>) => ReactModule.createElement(View, props),
  };
});

jest.mock('phosphor-react-native', () => {
  const ReactModule = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const icon = (testID: string) => () => ReactModule.createElement(View, { testID });

  return {
    User: icon('user-icon'),
    Gear: icon('gear-icon'),
    ClockCounterClockwise: icon('history-icon'),
    Question: icon('question-icon'),
    SignOut: icon('sign-out-icon'),
    CaretRight: icon('caret-icon'),
    Phone: icon('phone-icon'),
    CheckCircle: icon('verified-icon'),
    WarningCircle: icon('warning-icon'),
    Wallet: icon('wallet-icon'),
  };
});

jest.mock('@shared/contexts/ThemeContext', () => ({
  useTheme: () => mockTheme,
}));

jest.mock('@shared/hooks', () => ({
  useFloatingTabBarContentInset: () => 0,
  useTabBarScrollBehavior: () => jest.fn(),
  useThemedStyles: (factory: (theme: typeof mockTheme) => unknown) => factory(mockTheme),
}));

jest.mock('@shared/components', () => ({
  UserAvatar: () => null,
}));

jest.mock('@features/auth/store/useAuthStore', () => ({
  useAuthStore: (selector: (state: typeof mockAuthState) => unknown) => selector(mockAuthState),
}));

jest.mock('@shared/constants/config', () => ({
  appConfig: { appVersion: 'test' },
}));

jest.mock('../components/FinancialFeatureNotice', () => ({
  FinancialFeatureNotice: () => null,
}));

jest.mock('../config/financialCapabilities', () => ({
  isProfileWalletEntryPointEnabled: () => false,
}));

import { ProfileOverviewScreen } from './ProfileOverviewScreen';

const longVietnameseName = 'Nguyễn Văn Hành Khách Có Tên Rất Dài '.repeat(4).slice(0, 100);

const renderProfile = async (): Promise<ReactTestRenderer.ReactTestRenderer> => {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(<ProfileOverviewScreen />);
  });

  return renderer!;
};

describe('ProfileOverviewScreen identity layout', () => {
  beforeEach(() => {
    mockAuthState = {
      user: {
        fullName: longVietnameseName,
        phone: '0900000000',
        email: 'passenger@example.com',
        status: 'ACTIVE',
      },
      logout: jest.fn(async () => undefined),
    };
  });

  it.each([
    ['ACTIVE', 'verified-icon'],
    ['PENDING', 'warning-icon'],
  ])('keeps the fixed badge beside an ellipsized long name for %s accounts', async (
    status,
    iconTestID,
  ) => {
    mockAuthState.user.status = status;
    const renderer = await renderProfile();
    const name = renderer.root.findByProps({ testID: 'profile-display-name' });
    const row = renderer.root.findByProps({ testID: 'profile-name-row' });
    const badge = renderer.root.findByProps({ testID: 'profile-verification-badge' });
    const nameStyle = StyleSheet.flatten(name.props.style);
    const rowStyle = StyleSheet.flatten(row.props.style);
    const badgeStyle = StyleSheet.flatten(badge.props.style);

    expect(name.props.children).toBe(longVietnameseName);
    expect(name.props.numberOfLines).toBe(1);
    expect(name.props.ellipsizeMode).toBe('tail');
    expect(name.props.allowFontScaling).not.toBe(false);
    expect(nameStyle).toEqual(expect.objectContaining({
      flexShrink: 1,
      minWidth: 0,
    }));
    expect(nameStyle.flexGrow).toBeUndefined();
    expect(rowStyle.justifyContent).toBeUndefined();
    expect(badgeStyle).toEqual(expect.objectContaining({
      width: 18,
      height: 18,
      flexShrink: 0,
    }));
    expect(badge.findAllByProps({ testID: iconTestID }).length).toBeGreaterThan(0);

    await act(async () => renderer.unmount());
  });

  it('keeps a short name intrinsic while leaving the badge adjacent', async () => {
    mockAuthState.user.fullName = 'Nguyễn An';
    const renderer = await renderProfile();
    const name = renderer.root.findByProps({ testID: 'profile-display-name' });
    const row = renderer.root.findByProps({ testID: 'profile-name-row' });

    expect(name.props.children).toBe('Nguyễn An');
    expect(StyleSheet.flatten(name.props.style).flexGrow).toBeUndefined();
    expect(StyleSheet.flatten(row.props.style).justifyContent).toBeUndefined();
    expect(
      renderer.root.findAllByProps({ testID: 'profile-verification-badge' }).length,
    ).toBeGreaterThan(0);

    await act(async () => renderer.unmount());
  });

});
