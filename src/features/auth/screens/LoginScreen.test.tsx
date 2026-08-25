import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';

const mockNavigate = jest.fn();
const mockSetSession = jest.fn();
const mockClearAuthError = jest.fn();

jest.mock('react-i18next', () => ({
  initReactI18next: {
    type: '3rdParty',
    init: jest.fn(),
  },
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useRoute: () => ({ params: {} }),
}));
jest.mock('@tanstack/react-query', () => ({
  useMutation: () => ({
    isPending: false,
    mutateAsync: jest.fn(),
  }),
}));
jest.mock('react-native-safe-area-context', () => {
  const ReactModule = require('react');
  const { View: MockSafeAreaView } = require('react-native');

  return {
    SafeAreaView: ({ children, ...props }: { children: React.ReactNode }) =>
      ReactModule.createElement(MockSafeAreaView, props, children),
  };
});
jest.mock('react-native-svg', () => {
  const ReactModule = require('react');
  const { View: MockSvgView } = require('react-native');
  const MockSvg = ({ children, ...props }: { children?: React.ReactNode }) =>
    ReactModule.createElement(MockSvgView, props, children);

  return {
    __esModule: true,
    default: MockSvg,
    Defs: MockSvg,
    LinearGradient: MockSvg,
    Stop: MockSvg,
    Rect: MockSvg,
  };
});
jest.mock('phosphor-react-native', () => ({
  GoogleLogo: () => null,
}));
jest.mock('@shared/components', () => {
  const ReactModule = require('react');
  const { View: MockView } = require('react-native');

  return {
    AppKeyboardAwareScrollView: ({
      children,
      ...props
    }: { children: React.ReactNode }) => ReactModule.createElement(
      MockView,
      { ...props, testID: 'login-scroll' },
      children,
    ),
    Button: () => null,
    Input: () => null,
  };
});
jest.mock('@shared/contexts/ThemeContext', () => ({
  useTheme: () => jest.requireActual('@shared/theme').themes.liquid_light,
}));
jest.mock('@shared/hooks', () => ({
  useApiError: () => ({
    clearError: jest.fn(),
    errorMessage: null,
    handleError: jest.fn(),
  }),
  useThemedStyles: (factory: (theme: unknown) => unknown) =>
    factory(jest.requireActual('@shared/theme').themes.liquid_light),
}));
jest.mock('@shared/hooks/useResponsiveLayout', () => ({
  useResponsiveLayout: () => ({ isCompact: true }),
}));
jest.mock('../api/authApi', () => ({ login: jest.fn() }));
jest.mock('../store/useAuthStore', () => ({
  useAuthStore: (selector: (state: object) => unknown) => selector({
    authError: null,
    clearAuthError: mockClearAuthError,
    setSession: mockSetSession,
  }),
}));
jest.mock('../hooks/useGoogleLogin', () => ({
  useGoogleLogin: () => ({
    errorMessage: null,
    isPending: false,
    signInWithGoogle: jest.fn(),
  }),
}));
jest.mock('../components', () => {
  const ReactModule = require('react');
  const { View: MockView } = require('react-native');

  return {
    AuthStepHeader: () => ReactModule.createElement(MockView, {
      testID: 'auth-step-header',
    }),
    AuthFooter: () => ReactModule.createElement(MockView, {
      testID: 'auth-footer',
    }),
  };
});

import { LoginScreen } from './LoginScreen';
import { RegisterScreen } from './RegisterScreen';
import { OTPVerificationScreen } from './OTPVerificationScreen';
import { ForgotPasswordScreen } from './ForgotPasswordScreen';
import { ResetPasswordScreen } from './ResetPasswordScreen';

describe('LoginScreen responsive shell', () => {
  it('keeps the footer in the scroll flow and applies the bottom safe area', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    act(() => {
      renderer = ReactTestRenderer.create(<LoginScreen />);
    });

    const safeArea = renderer!.root.findByProps({ testID: 'login-safe-area' });
    const scroll = renderer!.root.findByProps({ testID: 'login-scroll' });

    expect(safeArea.props.edges).toEqual(['top', 'bottom', 'left', 'right']);
    expect(scroll.findByProps({ testID: 'auth-footer' })).toBeDefined();

    act(() => renderer!.unmount());
  });
});

describe('Auth screen safe-area shell', () => {
  it.each([
    ['Register', RegisterScreen, true],
    ['OTP verification', OTPVerificationScreen, true],
    ['Forgot password', ForgotPasswordScreen, false],
    ['Reset password', ResetPasswordScreen, false],
  ] as const)(
    'protects the %s screen from the Android bottom inset',
    async (_name, Screen, hasFooter) => {
      let renderer: ReactTestRenderer.ReactTestRenderer;

      await act(async () => {
        renderer = ReactTestRenderer.create(<Screen />);
      });

      const safeArea = renderer!.root.findAll((node) => (
        Array.isArray(node.props.edges)
      ))[0];
      expect(safeArea.props.edges).toContain('bottom');

      if (hasFooter) {
        const scroll = renderer!.root.findByProps({ testID: 'login-scroll' });
        expect(scroll.findByProps({ testID: 'auth-footer' })).toBeDefined();
      }

      await act(async () => renderer!.unmount());
    },
  );
});
