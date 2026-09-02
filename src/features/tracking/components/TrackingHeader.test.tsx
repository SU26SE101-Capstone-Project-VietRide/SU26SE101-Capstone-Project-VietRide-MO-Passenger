import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';

import { spacing } from '@shared/theme';

const mockTheme = {
  colors: {
    divider: '#DDE5E3',
    error: '#B3261E',
    errorLight: '#FCE8E6',
    primary: '#007D78',
    surface: '#FFFFFF',
    textPrimary: '#10201F',
    textTertiary: '#70817F',
  },
  components: {
    headerButton: {
      alignItems: 'center',
      justifyContent: 'center',
    },
  },
  effects: {
    contentBorderStrong: '#C7D5D2',
    contentSurfaceElevated: '#FFFFFF',
    isLiquid: false,
  },
};

jest.mock('@shared/contexts/ThemeContext', () => ({
  useTheme: () => mockTheme,
}));

jest.mock('@shared/hooks', () => ({
  useThemedStyles: (factory: (theme: typeof mockTheme) => unknown) =>
    factory(mockTheme),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('phosphor-react-native', () => ({
  ArrowLeft: () => null,
}));

import { TrackingHeader } from './TrackingHeader';

describe('TrackingHeader', () => {
  it('keeps two icon actions accessible without collapsing a long title', () => {
    const onShare = jest.fn();
    const onReport = jest.fn();
    let renderer: ReactTestRenderer.ReactTestRenderer;

    act(() => {
      renderer = ReactTestRenderer.create(
        <TrackingHeader
          actions={[
            {
              key: 'share',
              accessibilityLabel: 'Share live location',
              accessibilityHint: 'Opens the device share sheet',
              icon: <Text testID="share-icon">Share</Text>,
              onPress: onShare,
            },
            {
              key: 'report',
              accessibilityLabel: 'Report incident',
              busy: true,
              icon: <Text testID="report-icon">Report</Text>,
              tone: 'destructive',
              onPress: onReport,
            },
          ]}
          onBack={jest.fn()}
          subtitle="Parcel VR-2026-000001"
          title="A very long tracking title that must yield to quick actions"
        />,
      );
    });

    const actionGroup = renderer!.root.findByProps({
      testID: 'tracking-header-actions',
    });
    const share = renderer!.root.findByProps({
      testID: 'tracking-header-action-share',
    });
    const report = renderer!.root.findByProps({
      testID: 'tracking-header-action-report',
    });
    const title = renderer!.root
      .findAllByType(Text)
      .find(
        node =>
          node.props.children ===
          'A very long tracking title that must yield to quick actions',
      );
    const titleContainer = title!.parent!;

    expect(StyleSheet.flatten(actionGroup.props.style)).toMatchObject({
      flexShrink: 0,
      gap: spacing.sm,
    });
    expect(
      StyleSheet.flatten(share.props.style({ pressed: false })),
    ).toMatchObject({
      width: 44,
      height: 44,
    });
    expect(share.props.hitSlop).toBe(4);
    expect(share.props.accessibilityHint).toBe('Opens the device share sheet');
    expect(share.props.accessibilityState).toEqual({
      busy: false,
      disabled: false,
    });
    expect(report.props.disabled).toBe(true);
    expect(report.props.accessibilityState).toEqual({
      busy: true,
      disabled: true,
    });
    expect(
      StyleSheet.flatten(report.props.style({ pressed: false })),
    ).toMatchObject({
      backgroundColor: mockTheme.colors.errorLight,
      borderColor: mockTheme.colors.error,
    });
    expect(report.findAllByType(ActivityIndicator)).toHaveLength(1);
    expect(report.findByType(ActivityIndicator).props.color).toBe(
      mockTheme.colors.error,
    );
    expect(
      renderer!.root.findAllByProps({ testID: 'report-icon' }),
    ).toHaveLength(0);
    expect(title!.props.numberOfLines).toBe(1);
    expect(StyleSheet.flatten(titleContainer.props.style)).toMatchObject({
      flex: 1,
      minWidth: 0,
    });

    act(() => share.props.onPress());
    expect(onShare).toHaveBeenCalledTimes(1);
    expect(onReport).not.toHaveBeenCalled();

    act(() => renderer!.unmount());
  });

  it('keeps the balanced 48px trailing spacer when actions are absent', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    act(() => {
      renderer = ReactTestRenderer.create(
        <TrackingHeader
          onBack={jest.fn()}
          subtitle="Live vehicle location"
          title="Live tracking"
          route={{ originName: 'Hanoi', destinationName: 'Da Nang' }}
        />,
      );
    });

    const spacer = renderer!.root.findByProps({
      testID: 'tracking-header-trailing-spacer',
    });
    expect(StyleSheet.flatten(spacer.props.style)).toMatchObject({
      width: 48,
      height: 48,
    });
    expect(
      renderer!.root.findAllByProps({ testID: 'tracking-header-actions' }),
    ).toHaveLength(0);
    expect(
      renderer!.root.findByProps({ accessibilityRole: 'summary' }),
    ).toBeDefined();
    const routeSummary = renderer!.root.findByProps({
      accessibilityRole: 'summary',
    });
    const origin = renderer!.root.findByProps({
      testID: 'tracking-header-route-origin',
    });
    const destination = renderer!.root.findByProps({
      testID: 'tracking-header-route-destination',
    });
    expect(StyleSheet.flatten(routeSummary.props.style)).not.toMatchObject({
      flexDirection: 'row',
    });
    expect(origin.props.numberOfLines).toBe(1);
    expect(origin.props.ellipsizeMode).toBe('tail');
    expect(destination.props.numberOfLines).toBe(1);
    expect(destination.props.ellipsizeMode).toBe('tail');
    expect(origin.parent).not.toBe(destination.parent);

    act(() => renderer!.unmount());
  });
});
