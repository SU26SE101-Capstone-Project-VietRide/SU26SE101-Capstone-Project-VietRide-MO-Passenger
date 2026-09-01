import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';

const mockTheme = {
  colors: {
    divider: '#DDE5E3',
    error: '#B3261E',
    errorLight: '#FCE8E6',
    primary: '#007D78',
    surfaceAlt: '#F3F7F6',
    textInverse: '#FFFFFF',
    textPrimary: '#10201F',
    textSecondary: '#435A57',
    textTertiary: '#70817F',
    warning: '#A46000',
    warningForeground: '#795900',
    warningLight: '#FFF2D6',
  },
  components: {
    card: {},
    surface: {},
  },
  isDark: false,
};

jest.mock('@shared/contexts/ThemeContext', () => ({
  useTheme: () => mockTheme,
}));

jest.mock('@shared/hooks/useThemedStyles', () => ({
  useThemedStyles: (factory: (theme: typeof mockTheme) => unknown) => factory(mockTheme),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('phosphor-react-native', () => ({
  Clock: () => null,
  LinkBreak: () => null,
  MapPin: () => null,
  ShareNetwork: () => null,
  Target: () => null,
  WarningCircle: () => null,
  WifiSlash: () => null,
}));

import { TrackingDetailsContent } from './TrackingDetailsContent';

const createProps = (overrides: Record<string, unknown> = {}) => ({
  canCreateTripShare: true,
  canRevokeTripShare: true,
  hasEtaRouteMismatch: false,
  hasTrackingTarget: true,
  isOnline: true,
  isRevoking: false,
  isShareOperationPending: false,
  isSharing: false,
  isTerminal: false,
  onRetry: jest.fn(),
  onRevokeTripShare: jest.fn(),
  onShareTrip: jest.fn(),
  routeUnavailable: false,
  showPrimaryShareAction: true,
  targetInsight: null,
  transientError: false,
  ...overrides,
});

describe('TrackingDetailsContent', () => {
  it('keeps Share/Revoke actions and the Parcel/footer slot interactive', () => {
    const onShareTrip = jest.fn();
    const onRevokeTripShare = jest.fn();
    let renderer: ReactTestRenderer.ReactTestRenderer;

    act(() => {
      renderer = ReactTestRenderer.create(
        <TrackingDetailsContent
          {...createProps({ onShareTrip, onRevokeTripShare })}
          detailsFooter={<Text testID="tracking-details-footer">Parcel timeline</Text>}
        />,
      );
    });

    const shareButton = renderer!.root.findByProps({
      accessibilityLabel: 'tracking.share.action',
    });
    const revokeButton = renderer!.root.findByProps({
      accessibilityLabel: 'tracking.share.revokeAction',
    });
    expect(shareButton.props.disabled).toBe(false);
    expect(revokeButton.props.disabled).toBe(false);
    act(() => shareButton.props.onPress());
    act(() => revokeButton.props.onPress());
    expect(onShareTrip).toHaveBeenCalledTimes(1);
    expect(onRevokeTripShare).toHaveBeenCalledTimes(1);
    expect(renderer!.root.findByProps({ testID: 'tracking-details-footer' })).toBeDefined();

    act(() => renderer!.unmount());
  });

  it('disables both share mutations while offline or another share operation is pending', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    act(() => {
      renderer = ReactTestRenderer.create(
        <TrackingDetailsContent
          {...createProps({ isOnline: false, isShareOperationPending: true })}
        />,
      );
    });

    const shareButton = renderer!.root.findByProps({
      accessibilityLabel: 'tracking.share.action',
    });
    const revokeButton = renderer!.root.findByProps({
      accessibilityLabel: 'tracking.share.revokeAction',
    });
    expect(shareButton.props.disabled).toBe(true);
    expect(revokeButton.props.disabled).toBe(true);
    expect(shareButton.props.accessibilityState).toEqual({ busy: false, disabled: true });
    expect(revokeButton.props.accessibilityState).toEqual({ busy: false, disabled: true });

    act(() => renderer!.unmount());
  });

  it('removes the Share/Revoke body section in header quick-action mode', () => {
    const onRevokeTripShare = jest.fn();
    let renderer: ReactTestRenderer.ReactTestRenderer;

    act(() => {
      renderer = ReactTestRenderer.create(
        <TrackingDetailsContent
          {...createProps({
            onRevokeTripShare,
            showPrimaryShareAction: false,
          })}
          detailsFooter={<Text testID="tracking-details-footer">Parcel timeline</Text>}
        />,
      );
    });

    expect(renderer!.root.findAllByProps({
      accessibilityLabel: 'tracking.share.action',
    })).toHaveLength(0);
    expect(renderer!.root.findAllByProps({
      accessibilityLabel: 'tracking.share.revokeAction',
    })).toHaveLength(0);
    expect(onRevokeTripShare).not.toHaveBeenCalled();
    expect(renderer!.root.findByProps({ testID: 'tracking-details-footer' })).toBeDefined();

    const renderedText = renderer!.root
      .findAllByType(Text)
      .map((node) => node.props.children)
      .flat(Infinity);
    expect(renderedText).not.toEqual(expect.arrayContaining([
      'tracking.share.title',
      'tracking.share.description',
      'tracking.share.privacyNote',
    ]));

    act(() => renderer!.unmount());
  });

  it('shows only Revoke when an existing grant survives a terminal trip transition', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    act(() => {
      renderer = ReactTestRenderer.create(
        <TrackingDetailsContent
          {...createProps({
            canCreateTripShare: false,
            canRevokeTripShare: true,
            isTerminal: true,
          })}
        />,
      );
    });

    expect(renderer!.root.findAllByProps({
      accessibilityLabel: 'tracking.share.action',
    })).toHaveLength(0);
    expect(renderer!.root.findByProps({
      accessibilityLabel: 'tracking.share.revokeAction',
    })).toBeDefined();

    act(() => renderer!.unmount());
  });
});
