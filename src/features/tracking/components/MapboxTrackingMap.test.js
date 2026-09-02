const React = require('react');
const ReactTestRenderer = require('react-test-renderer');
const { StyleSheet } = require('react-native');

const mockSetCamera = jest.fn();

jest.mock('phosphor-react-native', () => ({
  Crosshair: () => null,
  FlagCheckered: () => null,
  MapPin: () => null,
  NavigationArrow: () => null,
  Signpost: () => null,
  Target: () => null,
}));

jest.mock('react-native-reanimated', () => {
  const ReactModule = require('react');
  const { View: NativeView } = require('react-native');

  return {
    __esModule: true,
    default: { View: NativeView },
    cancelAnimation: jest.fn(),
    Easing: {
      out: easing => easing,
      quad: value => value,
    },
    useAnimatedStyle: factory => factory(),
    useSharedValue: value => ReactModule.useRef({ value }).current,
    withRepeat: value => value,
    withTiming: value => value,
  };
});

const mockTheme = {
  isDark: false,
  colors: {
    surfaceElevated: '#FFFFFF',
    textInverse: '#FFFFFF',
    textPrimary: '#10201F',
    textSecondary: '#435A57',
  },
  effects: {
    isLiquid: false,
    cardShadow: {},
    floatingShadow: {},
    glassBorderStrong: '#DDE5E3',
    glassSurfaceStrong: '#FFFFFF',
  },
};

jest.mock('@shared/contexts/ThemeContext', () => ({
  useTheme: () => mockTheme,
}));

jest.mock('@shared/hooks/useThemedStyles', () => ({
  useThemedStyles: factory => factory(mockTheme),
}));

jest.mock('@shared/motion', () => ({
  motionTokens: { duration: { emphasis: 320 } },
  useMotion: () => ({ reduceMotion: true }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: key => key }),
}));

jest.mock('./mapbox', () => {
  const ReactModule = require('react');
  const { View: NativeView } = require('react-native');

  const createChild = testID => {
    const Child = props =>
      ReactModule.createElement(
        NativeView,
        { ...props, testID },
        props.children,
      );
    Child.displayName = 'Mock' + testID;
    return Child;
  };

  const MapView = props =>
    ReactModule.createElement(
      NativeView,
      { ...props, testID: 'tracking-mapbox-map' },
      props.children,
    );

  const Camera = ReactModule.forwardRef((props, ref) => {
    ReactModule.useImperativeHandle(ref, () => ({ setCamera: mockSetCamera }));
    return ReactModule.createElement(NativeView, {
      ...props,
      testID: 'tracking-mapbox-camera',
    });
  });
  Camera.displayName = 'MockMapboxCamera';

  const mockMapbox = {
    Camera,
    LineLayer: createChild('tracking-mapbox-line-layer'),
    MapView,
    MarkerView: createChild('tracking-mapbox-marker-view'),
    ShapeSource: createChild('tracking-mapbox-shape-source'),
    StyleURL: { Dark: 'mapbox-dark', Street: 'mapbox-street' },
  };

  return {
    __esModule: true,
    default: mockMapbox,
  };
});

const { MapboxTrackingMap } = require('./MapboxTrackingMap');
const {
  TRACKING_MAP_DARK_PALETTE,
  TRACKING_MAP_LIGHT_PALETTE,
} = require('./trackingMapStyles');

const makePoint = (recordedAt, overrides = {}) => ({
  tripId: 'trip-1',
  latitude: 10.7769,
  longitude: 106.7009,
  recordedAt,
  ...overrides,
});

const relativeLuminance = hex => {
  const channels = [1, 3, 5].map(
    index => parseInt(hex.slice(index, index + 2), 16) / 255,
  );
  const linear = channels.map(channel =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );

  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
};

const contrastRatio = (first, second) => {
  const lighter = Math.max(relativeLuminance(first), relativeLuminance(second));
  const darker = Math.min(relativeLuminance(first), relativeLuminance(second));
  return (lighter + 0.05) / (darker + 0.05);
};

describe('MapboxTrackingMap', () => {
  beforeEach(() => {
    mockTheme.isDark = false;
    mockSetCamera.mockClear();
  });

  it('fits the initial route only after Mapbox finishes loading', () => {
    const latest = makePoint('2026-08-12T01:00:00.000Z', {
      latitude: 10.78,
      longitude: 106.71,
    });
    let renderer;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        React.createElement(MapboxTrackingMap, {
          latest,
          plannedRoute: [
            { latitude: 10.77, longitude: 106.69 },
            { latitude: 10.8, longitude: 106.73 },
          ],
        }),
      );
    });

    const map = renderer.root.findByProps({ testID: 'tracking-mapbox-map' });
    expect(mockSetCamera).not.toHaveBeenCalled();

    ReactTestRenderer.act(() => map.props.onDidFinishLoadingMap());

    expect(mockSetCamera).toHaveBeenCalledWith(
      expect.objectContaining({
        bounds: {
          ne: [106.73, 10.8],
          sw: [106.69, 10.77],
        },
        padding: {
          paddingTop: 48,
          paddingRight: 32,
          paddingBottom: 72,
          paddingLeft: 32,
        },
        animationDuration: 0,
        animationMode: 'none',
      }),
    );

    ReactTestRenderer.act(() => renderer.unmount());
  });

  it('stops camera following after a gesture and recenters only on request', () => {
    const first = makePoint('2026-08-12T01:00:00.000Z');
    const second = makePoint('2026-08-12T01:00:05.000Z', {
      latitude: 10.78,
      longitude: 106.71,
    });
    let renderer;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        React.createElement(MapboxTrackingMap, {
          latest: first,
        }),
      );
    });

    const map = renderer.root.findByProps({ testID: 'tracking-mapbox-map' });
    ReactTestRenderer.act(() => map.props.onDidFinishLoadingMap());
    mockSetCamera.mockClear();

    ReactTestRenderer.act(() =>
      map.props.onCameraChanged({
        gestures: { isGestureActive: true },
      }),
    );
    ReactTestRenderer.act(() => {
      renderer.update(
        React.createElement(MapboxTrackingMap, {
          latest: second,
        }),
      );
    });

    expect(mockSetCamera).not.toHaveBeenCalled();

    const followButton = renderer.root.findAll(
      node =>
        node.props.accessibilityRole === 'button' &&
        node.props.accessibilityState?.disabled === false &&
        node.props.accessibilityState?.selected === false,
    )[0];

    ReactTestRenderer.act(() => followButton.props.onPress());

    expect(mockSetCamera).toHaveBeenCalledWith(
      expect.objectContaining({
        centerCoordinate: [106.71, 10.78],
        zoomLevel: 15,
        animationDuration: 0,
        animationMode: 'none',
      }),
    );

    ReactTestRenderer.act(() => renderer.unmount());
  });

  it('centers every legend icon in the same fixed-width slot', () => {
    let renderer;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        React.createElement(MapboxTrackingMap, {
          latest: null,
          plannedRoute: [
            { latitude: 10.77, longitude: 106.69 },
            { latitude: 10.8, longitude: 106.73 },
          ],
          markers: [
            {
              id: 'origin',
              name: 'Origin station',
              latitude: 10.77,
              longitude: 106.69,
              kind: 'origin',
            },
            {
              id: 'other-stop',
              name: 'Other stop',
              latitude: 10.785,
              longitude: 106.705,
              kind: 'intermediate',
              sequence: 2,
            },
            {
              id: 'target',
              name: 'Passenger stop',
              latitude: 10.79,
              longitude: 106.71,
              kind: 'target',
            },
            {
              id: 'destination',
              name: 'Destination station',
              latitude: 10.8,
              longitude: 106.73,
              kind: 'destination',
            },
          ],
          showDrivenTrail: false,
        }),
      );
    });

    const iconSlots = renderer.root.findAll(
      node =>
        node.props.testID === 'tracking-map-legend-icon-slot' &&
        node.props.style?.width === 16,
    );
    expect(iconSlots.length).toBeGreaterThanOrEqual(5);
    expect(
      iconSlots.every(
        slot =>
          slot.props.style.height === 16 &&
          slot.props.style.alignItems === 'center' &&
          slot.props.style.justifyContent === 'center',
      ),
    ).toBe(true);

    const otherStopsLegend = renderer.root.findByProps({
      testID: 'tracking-map-legend-intermediate',
    });
    expect(
      otherStopsLegend.findAll(
        node =>
          node.props.testID === 'tracking-map-legend-icon-slot' &&
          node.props.style?.width === 16,
      ).length,
    ).toBeGreaterThan(0);

    ReactTestRenderer.act(() => renderer.unmount());
  });

  it('keeps semantic marker glyphs accessible in light and dark palettes', () => {
    [TRACKING_MAP_LIGHT_PALETTE, TRACKING_MAP_DARK_PALETTE].forEach(palette => {
      [
        'origin',
        'destination',
        'target',
        'next',
        'shuttleTarget',
        'shuttleStation',
      ].forEach(role => {
        expect(
          contrastRatio(palette.markerGlyph, palette[role]),
        ).toBeGreaterThanOrEqual(4.5);
      });
      expect(
        contrastRatio(palette.vehicleGlyph, palette.vehicle),
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        new Set([
          palette.plannedRoute,
          palette.trail,
          palette.origin,
          palette.destination,
          palette.target,
        ]),
      ).toHaveProperty('size', 5);
    });
  });

  it('mirrors semantic colors and route patterns in the legend for both themes', () => {
    const trail = [
      makePoint('2026-08-12T01:00:00.000Z', {
        latitude: 10.77,
        longitude: 106.69,
      }),
      makePoint('2026-08-12T01:00:05.000Z', {
        latitude: 10.78,
        longitude: 106.71,
      }),
    ];
    const props = {
      latest: trail[1],
      trail,
      plannedRoute: [
        { latitude: 10.77, longitude: 106.69 },
        { latitude: 10.8, longitude: 106.73 },
      ],
      markers: [
        {
          id: 'origin',
          name: 'Origin station',
          latitude: 10.77,
          longitude: 106.69,
          kind: 'origin',
        },
        {
          id: 'target',
          name: 'Passenger stop',
          latitude: 10.79,
          longitude: 106.71,
          kind: 'target',
        },
        {
          id: 'destination',
          name: 'Destination station',
          latitude: 10.8,
          longitude: 106.73,
          kind: 'destination',
        },
      ],
    };

    const verifyTheme = (palette, styleURL) => {
      let renderer;
      ReactTestRenderer.act(() => {
        renderer = ReactTestRenderer.create(
          React.createElement(MapboxTrackingMap, props),
        );
      });

      expect(
        renderer.root.findByProps({ testID: 'tracking-mapbox-map' }).props
          .styleURL,
      ).toBe(styleURL);

      const legendFill = testID =>
        renderer.root.findByProps({ testID }).props.style[1].backgroundColor;
      expect(legendFill('tracking-map-legend-route-swatch')).toBe(
        palette.plannedRoute,
      );
      expect(legendFill('tracking-map-legend-origin-swatch')).toBe(
        palette.origin,
      );
      expect(legendFill('tracking-map-legend-destination-swatch')).toBe(
        palette.destination,
      );
      expect(legendFill('tracking-map-legend-target-swatch')).toBe(
        palette.target,
      );

      const legendTrail = renderer.root.findByProps({
        testID: 'tracking-map-legend-trail-swatch',
      });
      const trailDashes = React.Children.toArray(legendTrail.props.children);
      expect(trailDashes).toHaveLength(3);
      expect(
        trailDashes.every(
          dash => dash.props.style[1]?.backgroundColor === palette.trail,
        ),
      ).toBe(true);

      const routeLayers = renderer.root.findAllByProps({
        testID: 'tracking-mapbox-line-layer',
      });
      const dashedLayers = routeLayers.filter(layer =>
        Array.isArray(layer.props.style.lineDasharray),
      );
      expect(new Set(dashedLayers.map(layer => layer.props.id))).toEqual(
        new Set(['tracking-driven-trail-halo', 'tracking-driven-trail-line']),
      );
      expect(
        dashedLayers.every(
          layer =>
            layer.props.style.lineDasharray[0] === 1.4 &&
            layer.props.style.lineDasharray[1] === 1.1,
        ),
      ).toBe(true);

      ReactTestRenderer.act(() => renderer.unmount());
    };

    verifyTheme(TRACKING_MAP_LIGHT_PALETTE, 'mapbox-street');
    mockTheme.isDark = true;
    verifyTheme(TRACKING_MAP_DARK_PALETTE, 'mapbox-dark');
  });
  it('renders Mapbox route layers, semantic stops, attribution and Driver-style vehicle puck', () => {
    const latest = makePoint('2026-08-12T01:01:00.000Z', {
      latitude: 10.78,
      longitude: 106.71,
      speedKmh: 42,
    });
    let renderer;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        React.createElement(MapboxTrackingMap, {
          latest,
          plannedRoute: [
            { latitude: 10.77, longitude: 106.69 },
            { latitude: 10.8, longitude: 106.73 },
          ],
          markers: [
            {
              id: 'origin',
              name: 'Origin station',
              latitude: 10.77,
              longitude: 106.69,
              kind: 'origin',
            },
            {
              id: 'target',
              name: 'Passenger stop',
              latitude: 10.79,
              longitude: 106.71,
              kind: 'target',
              sequence: 2,
            },
          ],
          showDrivenTrail: false,
          bottomContentInset: 128,
        }),
      );
    });

    const map = renderer.root.findByProps({ testID: 'tracking-mapbox-map' });
    expect(map.props.styleURL).toBe('mapbox-street');
    expect(map.props.logoEnabled).toBe(true);
    expect(map.props.attributionEnabled).toBe(true);
    expect(map.props.logoPosition).toEqual({ bottom: 132, left: 8 });
    expect(map.props.attributionPosition).toEqual({ bottom: 132, right: 8 });

    const routeLayers = renderer.root.findAllByProps({
      testID: 'tracking-mapbox-line-layer',
    });
    const lineColors = new Set(
      routeLayers.map(layer => layer.props.style.lineColor),
    );
    expect(lineColors).toEqual(
      new Set([
        TRACKING_MAP_LIGHT_PALETTE.plannedRouteHalo,
        TRACKING_MAP_LIGHT_PALETTE.plannedRoute,
      ]),
    );
    expect(routeLayers.every(layer => layer.props.belowLayerID == null)).toBe(
      true,
    );

    const markerViewCoordinates = renderer.root
      .findAllByProps({
        testID: 'tracking-mapbox-marker-view',
      })
      .map(markerView => JSON.stringify(markerView.props.coordinate));
    expect(new Set(markerViewCoordinates)).toEqual(
      new Set([
        JSON.stringify([106.69, 10.77]),
        JSON.stringify([106.71, 10.79]),
        JSON.stringify([106.71, 10.78]),
      ]),
    );

    const stopMarkers = renderer.root.findAll(
      node =>
        node.props.testID === 'tracking-stop-marker' &&
        typeof node.props.style === 'function',
    );
    expect(stopMarkers).toHaveLength(2);
    expect(
      renderer.root.findAllByProps({
        testID: 'tracking-stop-label',
      }),
    ).toHaveLength(0);

    ReactTestRenderer.act(() => stopMarkers[0].props.onPress());

    expect(
      renderer.root.findAll(
        node =>
          node.props.testID === 'tracking-stop-label-text' &&
          node.props.children === 'Origin station',
      ).length,
    ).toBeGreaterThan(0);

    ReactTestRenderer.act(() => map.props.onPress());

    expect(
      renderer.root.findAllByProps({
        testID: 'tracking-stop-label',
      }),
    ).toHaveLength(0);
    expect(
      renderer.root.findByProps({
        testID: 'tracking-bus-vehicle-glyph',
      }),
    ).toBeTruthy();
    expect(
      renderer.root.findByProps({
        testID: 'tracking-speed-badge-value',
      }).props.children,
    ).toBe('42 km/h');

    ReactTestRenderer.act(() => renderer.unmount());
  });

  it('points a bus along the route ahead while keeping shuttle telemetry heading', () => {
    const latest = makePoint('2026-08-12T01:01:00.000Z', {
      latitude: 10,
      longitude: 106.0005,
      headingDeg: 270,
    });
    const plannedRoute = [
      { latitude: 10, longitude: 106 },
      { latitude: 10, longitude: 106.002 },
      { latitude: 10.01, longitude: 106.002 },
    ];
    let busRenderer;
    let shuttleRenderer;

    ReactTestRenderer.act(() => {
      busRenderer = ReactTestRenderer.create(
        React.createElement(MapboxTrackingMap, {
          latest,
          plannedRoute,
          vehicleKind: 'bus',
        }),
      );
      shuttleRenderer = ReactTestRenderer.create(
        React.createElement(MapboxTrackingMap, {
          latest,
          plannedRoute,
          vehicleKind: 'shuttle',
        }),
      );
    });

    const busRotation = StyleSheet.flatten(
      busRenderer.root.findByProps({
        testID: 'tracking-bus-vehicle-glyph',
      }).props.style,
    ).transform[0].rotate;
    const shuttleRotation = StyleSheet.flatten(
      shuttleRenderer.root.findByProps({
        testID: 'tracking-shuttle-vehicle-glyph',
      }).props.style,
    ).transform[0].rotate;

    expect(Number.parseFloat(busRotation)).toBeCloseTo(90, 0);
    expect(shuttleRotation).toBe('270deg');

    ReactTestRenderer.act(() => {
      busRenderer.unmount();
      shuttleRenderer.unmount();
    });
  });
});
