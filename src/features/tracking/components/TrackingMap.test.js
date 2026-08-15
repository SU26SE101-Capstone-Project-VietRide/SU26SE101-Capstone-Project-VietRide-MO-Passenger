const React = require('react');
const ReactTestRenderer = require('react-test-renderer');
const { StyleSheet, Text } = require('react-native');

jest.spyOn(React, 'lazy').mockImplementation(() => () => null);

const mockTheme = {
  colors: {
    divider: '#DDE5E3',
    surfaceAlt: '#F3F7F6',
    surfaceElevated: '#FFFFFF',
    textPrimary: '#10201F',
    textSecondary: '#435A57',
    textTertiary: '#6B7F7C',
  },
  effects: {
    isLiquid: false,
    cardShadow: {},
    contentBorderStrong: '#DDE5E3',
    contentSurfaceSoft: '#F3F7F6',
    glassBorder: '#DDE5E3',
    glassBorderStrong: '#DDE5E3',
    glassSurfaceStrong: '#FFFFFF',
  },
};

jest.mock('@shared/components', () => {
  const ReactModule = require('react');
  const { Text: MockText } = require('react-native');

  return {
    StatusChip: ({ label, style }) => ReactModule.createElement(
      MockText,
      { style, testID: 'mock-status-chip' },
      label,
    ),
  };
});

jest.mock('@shared/constants/config', () => ({
  appConfig: {
    isProd: false,
    nativeMapboxEnabled: { android: true, ios: true },
  },
}));

jest.mock('@shared/contexts/ThemeContext', () => ({
  useTheme: () => mockTheme,
}));

jest.mock('@shared/hooks/useThemedStyles', () => ({
  useThemedStyles: (factory) => factory(mockTheme),
}));

jest.mock('phosphor-react-native', () => ({
  MapPin: () => null,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}));

jest.mock('./MapboxTrackingMap', () => ({
  MapboxTrackingMap: () => null,
}));

jest.mock('@shared/maps/mapbox', () => ({
  ensureMapboxReady: () => Promise.resolve(true),
  preloadMapbox: () => undefined,
}));

const { TrackingMap } = require('./TrackingMap');

describe('TrackingMap overlays', () => {
  it('keeps the waiting GPS chip at bottom-right above the tracking sheet', async () => {
    let renderer;

    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(React.createElement(TrackingMap, {
        bottomContentInset: 128,
        connectionState: 'connecting',
        edgeToEdge: true,
        latest: null,
        plannedRoute: [
          { latitude: 10.7769, longitude: 106.7009 },
          { latitude: 10.7869, longitude: 106.7109 },
        ],
        showDrivenTrail: false,
        trail: [],
      }));
      await Promise.resolve();
    });

    const overlay = renderer.root.findByProps({
      testID: 'tracking-waiting-gps-overlay',
    });
    expect(StyleSheet.flatten(overlay.props.style)).toEqual(expect.objectContaining({
      bottom: 164,
      position: 'absolute',
      right: 8,
    }));
    expect(StyleSheet.flatten(overlay.props.style)).not.toEqual(expect.objectContaining({
      left: expect.any(Number),
    }));
    expect(StyleSheet.flatten(overlay.props.style)).not.toEqual(expect.objectContaining({
      top: expect.any(Number),
    }));
    expect(renderer.root.findByType(Text).props.children)
      .toBe('tracking.map.waitingGpsOverlay');

    ReactTestRenderer.act(() => renderer.unmount());
  });
});
