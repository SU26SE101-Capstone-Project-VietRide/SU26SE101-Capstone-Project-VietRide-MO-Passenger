import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { StyleSheet, Text } from 'react-native';

const mockTheme = {
  colors: {
    divider: '#DDE5E3',
    surfaceAlt: '#F3F7F6',
    surfaceElevated: '#FFFFFF',
    textPrimary: '#10201F',
    textSecondary: '#435A57',
  },
  effects: {
    isLiquid: false,
    cardShadow: {},
    contentBorder: '#DDE5E3',
    contentSurfaceSoft: '#F3F7F6',
    glassBorderStrong: '#DDE5E3',
    glassSurfaceStrong: '#FFFFFF',
  },
  isDark: false,
};

jest.mock('@shared/contexts/ThemeContext', () => ({
  useTheme: () => mockTheme,
}));

jest.mock('@shared/hooks/useThemedStyles', () => ({
  useThemedStyles: (factory: (theme: typeof mockTheme) => unknown) => factory(mockTheme),
}));

jest.mock('@shared/motion', () => ({
  motionTokens: { duration: { standard: 250 } },
  useMotion: () => ({ reduceMotion: false }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('phosphor-react-native', () => ({
  CaretDown: () => null,
  CaretUp: () => null,
}));

jest.mock('react-native-gesture-handler', () => {
  const createPanGesture = () => {
    const gesture = {
      onBegin: () => gesture,
      onEnd: () => gesture,
      onUpdate: () => gesture,
    };
    return gesture;
  };

  return {
    Gesture: { Pan: createPanGesture },
    GestureDetector: ({ children }: { children: React.ReactNode }) => children,
  };
});

jest.mock('react-native-reanimated', () => {
  const { View: MockAnimatedView } = require('react-native');

  return {
    __esModule: true,
    default: { View: MockAnimatedView },
    runOnJS: (callback: (...args: unknown[]) => unknown) => callback,
    useAnimatedStyle: (factory: () => object) => factory(),
    useDerivedValue: (factory: () => number) => ({ get value() { return factory(); } }),
    useSharedValue: (value: number) => ({ value }),
    withTiming: (value: number) => value,
  };
});

jest.mock('@shopify/flash-list', () => {
  const ReactModule = require('react');
  const { View: MockListView } = require('react-native');

  const MockFlashList = ({
    data = [],
    ListFooterComponent,
    renderItem,
  }: {
    data?: unknown[];
    ListFooterComponent?: React.ReactNode;
    renderItem: (info: { index: number; item: unknown }) => React.ReactNode;
  }) => ReactModule.createElement(
    MockListView,
    { testID: 'mock-upcoming-flash-list' },
    ...data.map((item, index) => ReactModule.createElement(
      ReactModule.Fragment,
      { key: index },
      renderItem({ item, index }),
    )),
    ListFooterComponent,
  );

  return { FlashList: MockFlashList };
});

import { UpcomingStopsSheet, type UpcomingStopSheetItem } from './UpcomingStopsSheet';

const featuredItems: UpcomingStopSheetItem[] = [
  {
    id: 'next',
    label: 'Next Stop',
    name: 'Compact next stop name',
    detail: '6 min',
    sequence: 1,
    tone: 'next',
  },
  {
    id: 'target',
    label: 'Your Stop',
    name: 'Compact passenger stop name',
    detail: '18 min',
    sequence: 3,
    tone: 'target',
  },
];

describe('UpcomingStopsSheet', () => {
  it('uses a compact complete preview and hides it visually when expanded', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    act(() => {
      renderer = ReactTestRenderer.create(
        <UpcomingStopsSheet
          containerHeight={320}
          featuredItems={featuredItems}
          footer={<Text testID="expanded-details-footer">Parcel timeline</Text>}
          items={featuredItems}
          onRefresh={() => undefined}
          refreshing={false}
        />,
      );
    });

    const compactCard = renderer!.root.findAll((node) => (
      node.props.accessibilityRole === 'summary'
      && StyleSheet.flatten(node.props.style)?.minHeight === 40
    ));
    expect(compactCard).not.toHaveLength(0);
    expect(renderer!.root.findAllByType(Text).some((node) => node.props.children === '6 min'))
      .toBe(true);
    expect(renderer!.root.findAllByType(Text).some((node) => node.props.children === '18 min'))
      .toBe(true);

    const toggle = renderer!.root.findByProps({ accessibilityRole: 'button' });
    act(() => toggle.props.onPress());

    const expandedToggle = renderer!.root.findByProps({ accessibilityRole: 'button' });
    expect(expandedToggle.props.accessibilityState).toEqual({ expanded: true });
    expect(renderer!.root.findByProps({ testID: 'expanded-details-footer' }))
      .toBeDefined();
    const hiddenPreview = renderer!.root.find((node) => (
      node.props.pointerEvents === 'none'
      && node.props.importantForAccessibility === 'no-hide-descendants'
      && node.props.accessibilityElementsHidden === true
    ));
    expect(StyleSheet.flatten(hiddenPreview.props.style)?.opacity).toBe(0);
    expect(renderer!.root.find((node) => (
      node.props.pointerEvents === 'auto'
      && node.props.importantForAccessibility === 'yes'
      && node.props.accessibilityElementsHidden === false
    ))).toBeDefined();

    act(() => renderer!.unmount());
  });
});
