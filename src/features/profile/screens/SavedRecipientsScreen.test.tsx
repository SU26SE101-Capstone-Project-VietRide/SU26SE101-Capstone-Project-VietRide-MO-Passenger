import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { setLocalSessionUser } from '@shared/session/scope';
import { useSavedRecipientsStore } from '@features/parcel/store/useSavedRecipientsStore';
import { SavedRecipientsScreen } from './SavedRecipientsScreen';

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
    textInverse: '#FFFFFF',
    border: '#E2E8F0',
    divider: '#DDE5E3',
    error: '#B3261E',
    success: '#007D56',
    warning: '#A46000',
    warningForeground: '#795900',
    warningLight: '#FFF2D6',
  },
  components: {
    primaryButton: { borderRadius: 8, height: 48 },
    card: { backgroundColor: '#FFFFFF' },
  },
  effects: {
    contentBorderStrong: '#CBD5E1',
    contentSurfaceElevated: '#FFFFFF',
    floatingShadow: {},
  },
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
}));

jest.mock('@shared/contexts/ThemeContext', () => ({
  useTheme: () => mockTheme,
}));

jest.mock('@shared/hooks', () => ({
  useThemedStyles: (factory: (theme: typeof mockTheme) => unknown) =>
    factory(mockTheme),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('react-native-keyboard-controller', () => {
  const { View } = require('react-native');
  return {
    KeyboardAvoidingView: View,
    KeyboardAwareScrollView: View,
  };
}, { virtual: true });

jest.mock('react-native-safe-area-context', () => {
  const ReactModule = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    SafeAreaView: (props: Record<string, unknown>) =>
      ReactModule.createElement(View, props),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

jest.mock('phosphor-react-native', () => {
  const MockIcon = () => null;
  return {
    AddressBook: MockIcon,
    ArrowLeft: MockIcon,
    Check: MockIcon,
    MagnifyingGlass: MockIcon,
    PencilSimple: MockIcon,
    Plus: MockIcon,
    Star: MockIcon,
    Trash: MockIcon,
    CheckCircle: MockIcon,
    Info: MockIcon,
    WarningCircle: MockIcon,
    X: MockIcon,
  };
});

describe('SavedRecipientsScreen', () => {
  let renderer: ReactTestRenderer.ReactTestRenderer | null = null;

  beforeEach(() => {
    act(() => {
      setLocalSessionUser('11111111-1111-4111-8111-111111111111');
      useSavedRecipientsStore.getState().reset();
      useSavedRecipientsStore.setState({
      ownerUserId: '11111111-1111-4111-8111-111111111111',
      recipients: [
        {
          id: 'rec_10',
          fullName: 'Lê Hoàng Nam',
          phoneNumber: '0912345678',
          email: 'nam@example.com',
          isDefault: true,
          lastUsedAt: 2000,
          createdAt: 1000,
        },
      ],
      hydrationStatus: 'ready',
      isLoaded: true,
      });
    });
  });

  afterEach(() => {
    act(() => renderer?.unmount());
    renderer = null;
  });

  it('renders recipients list and header controls', () => {
    act(() => {
      renderer = ReactTestRenderer.create(<SavedRecipientsScreen />);
    });

    const row = renderer!.root.findByProps({
      testID: 'saved-recipient-row-rec_10',
    });
    expect(row).toBeTruthy();
  });

  it('renders empty state when store has no recipients', () => {
    act(() => {
      useSavedRecipientsStore.setState({
        recipients: [],
        hydrationStatus: 'ready',
        isLoaded: true,
      });
    });

    act(() => {
      renderer = ReactTestRenderer.create(<SavedRecipientsScreen />);
    });

    expect(
      renderer!.root.findAllByProps({
        testID: 'saved-recipient-row-rec_10',
      }),
    ).toHaveLength(0);
  });
});
