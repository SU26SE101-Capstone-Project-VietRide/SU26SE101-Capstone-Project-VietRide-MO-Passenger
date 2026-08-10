const React = require('react');
const ReactTestRenderer = require('react-test-renderer');

const mockAnimateCamera = jest.fn();
const mockFitToCoordinates = jest.fn();

jest.mock('phosphor-react-native', () => ({
  Bus: () => null,
  Crosshair: () => null,
  FlagCheckered: () => null,
  MapPin: () => null,
  NavigationArrow: () => null,
  Signpost: () => null,
  Target: () => null,
  Van: () => null,
}));

jest.mock('react-native-maps', () => {
  const ReactModule = require('react');
  const { View: NativeView } = require('react-native');

  const MapView = ReactModule.forwardRef((props, ref) => {
    ReactModule.useImperativeHandle(ref, () => ({
      animateCamera: mockAnimateCamera,
      fitToCoordinates: mockFitToCoordinates,
    }));
    return ReactModule.createElement(
      NativeView,
      { ...props, testID: 'tracking-native-map' },
      props.children,
    );
  });
  MapView.displayName = 'MockMapView';

  const createMapChild = (testID) => {
    const MapChild = (props) => ReactModule.createElement(
      NativeView,
      { ...props, testID },
      props.children,
    );
    MapChild.displayName = `Mock${testID}`;
    return MapChild;
  };

  class MockAnimatedRegion {
    constructor(value) {
      Object.assign(this, value);
    }

    timing() {
      return { start: jest.fn() };
    }
  }

  return {
    __esModule: true,
    default: MapView,
    Marker: createMapChild('tracking-stop-marker'),
    MarkerAnimated: createMapChild('tracking-vehicle-marker'),
    Polyline: createMapChild('tracking-map-polyline'),
    AnimatedRegion: MockAnimatedRegion,
    PROVIDER_GOOGLE: 'google',
  };
});

const { NativeTrackingMap } = require('./NativeTrackingMap');
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

describe('NativeTrackingMap follow mode', () => {
  beforeEach(() => {
    mockAnimateCamera.mockClear();
    mockFitToCoordinates.mockClear();
  });

  it('fits the initial trip viewport only after the native map is ready', () => {
    const firstPoint = makePoint('2026-07-20T01:00:00.000Z');
    const secondPoint = makePoint('2026-07-20T01:00:05.000Z', {
      latitude: 10.78,
      longitude: 106.71,
    });
    let renderer;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(React.createElement(NativeTrackingMap, {
        latest: secondPoint,
        points: [firstPoint, secondPoint],
        plannedRoute: [
          { latitude: firstPoint.latitude, longitude: firstPoint.longitude },
          { latitude: secondPoint.latitude, longitude: secondPoint.longitude },
        ],
        stops: [],
      }));
    });

    const map = renderer.root.findByProps({ testID: 'tracking-native-map' });
    expect(mockFitToCoordinates).not.toHaveBeenCalled();

    ReactTestRenderer.act(() => map.props.onMapReady());

    expect(mockFitToCoordinates).toHaveBeenCalledTimes(1);
    expect(mockFitToCoordinates).toHaveBeenCalledWith(
      [
        { latitude: 10.7769, longitude: 106.7009 },
        { latitude: 10.78, longitude: 106.71 },
      ],
      {
        edgePadding: { top: 48, right: 32, bottom: 72, left: 32 },
        animated: false,
      },
    );

    ReactTestRenderer.act(() => renderer.unmount());
  });

  it('stops moving the camera after a pan and recenters only on request', () => {
    const firstPoint = makePoint('2026-07-20T01:00:00.000Z');
    const secondPoint = makePoint('2026-07-20T01:00:05.000Z', {
      latitude: 10.78,
      longitude: 106.71,
    });
    let renderer;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(React.createElement(NativeTrackingMap, {
        latest: firstPoint,
        points: [firstPoint],
        stops: [],
      }));
    });
    mockAnimateCamera.mockClear();

    const map = renderer.root.findByProps({ testID: 'tracking-native-map' });
    ReactTestRenderer.act(() => map.props.onRegionChangeComplete(
      map.props.initialRegion,
      { isGesture: true },
    ));

    ReactTestRenderer.act(() => {
      renderer.update(React.createElement(NativeTrackingMap, {
        latest: secondPoint,
        points: [firstPoint, secondPoint],
        stops: [],
      }));
    });
    expect(mockAnimateCamera).not.toHaveBeenCalled();

    const recenter = renderer.root.findAll((node) => (
      node.props.accessibilityRole === 'button'
      && node.props.accessibilityState?.disabled === false
      && node.props.accessibilityState?.selected === false
    ))[0];
    expect(recenter).toBeDefined();
    ReactTestRenderer.act(() => recenter.props.onPress());

    expect(mockAnimateCamera).toHaveBeenCalledTimes(1);
    expect(mockAnimateCamera).toHaveBeenCalledWith(
      {
        center: { latitude: 10.78, longitude: 106.71 },
        zoom: 15,
      },
      { duration: 320 },
    );

    ReactTestRenderer.act(() => renderer.unmount());
  });
});

describe('NativeTrackingMap route-only primitives', () => {
  beforeEach(() => {
    mockAnimateCamera.mockClear();
    mockFitToCoordinates.mockClear();
  });

  it('renders only the planned route, clear stop POIs, and inset-aware controls', () => {
    const trailStart = makePoint('2026-07-20T01:00:00.000Z');
    const latest = makePoint('2026-07-20T01:01:00.000Z', {
      latitude: 10.78,
      longitude: 106.71,
      speedKmh: 42,
    });
    const plannedRoute = [
      { latitude: 10.77, longitude: 106.69 },
      { latitude: 10.8, longitude: 106.73 },
    ];
    const markers = [
      {
        id: 'origin-station',
        name: 'Origin station',
        latitude: 10.77,
        longitude: 106.69,
        kind: 'origin',
      },
      {
        id: 'ordinary-stop',
        name: 'Ordinary stop',
        latitude: 10.775,
        longitude: 106.695,
        kind: 'intermediate',
        sequence: 1,
      },
      {
        id: 'target-stop',
        name: 'Target stop name',
        latitude: 10.79,
        longitude: 106.71,
        kind: 'target',
        sequence: 2,
      },
      {
        id: 'destination-station',
        name: 'Destination station',
        latitude: 10.8,
        longitude: 106.72,
        kind: 'destination',
      },
    ];
    let renderer;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(React.createElement(NativeTrackingMap, {
        latest,
        trail: [trailStart, latest],
        plannedRoute,
        markers,
        showDrivenTrail: false,
        bottomContentInset: 128,
      }));
    });

    const map = renderer.root.findByProps({ testID: 'tracking-native-map' });
    expect(map.props.mapPadding).toEqual({
      top: 52,
      right: 16,
      bottom: 184,
      left: 16,
    });
    expect(map.props.showsPointsOfInterest).toBe(false);
    expect(map.props.poiClickEnabled).toBe(false);

    const polylineColors = new Set(renderer.root.findAllByProps({
      testID: 'tracking-map-polyline',
    }).map((polyline) => polyline.props.strokeColor));
    expect(polylineColors).toEqual(new Set([
      TRACKING_MAP_LIGHT_PALETTE.plannedRouteHalo,
      TRACKING_MAP_LIGHT_PALETTE.plannedRoute,
    ]));
    expect(polylineColors.has(TRACKING_MAP_LIGHT_PALETTE.trail)).toBe(false);
    expect(polylineColors.has(TRACKING_MAP_LIGHT_PALETTE.trailHalo)).toBe(false);
    expect(renderer.root.findAll((node) => (
      Array.isArray(node.props.style)
      && node.props.style.some(
        (style) => style?.backgroundColor === TRACKING_MAP_LIGHT_PALETTE.trail,
      )
    ))).toHaveLength(0);

    const stopTitles = new Set(renderer.root.findAllByProps({
      testID: 'tracking-stop-marker',
    }).map((marker) => marker.props.title).filter(Boolean));
    expect(stopTitles).toEqual(new Set([
      'Origin station',
      '1. Ordinary stop',
      '2. Target stop name',
      'Destination station',
    ]));
    const ordinaryMarker = renderer.root.findAllByProps({ title: '1. Ordinary stop' })[0];
    const targetMarker = renderer.root.findAllByProps({ title: '2. Target stop name' })[0];
    const originMarker = renderer.root.findAllByProps({ title: 'Origin station' })[0];
    const destinationMarker = renderer.root.findAllByProps({ title: 'Destination station' })[0];
    expect(ordinaryMarker.props.description).toEqual(expect.any(String));
    expect(originMarker.props.description).toEqual(expect.any(String));
    expect(destinationMarker.props.description).toEqual(expect.any(String));
    expect(targetMarker.props.description).toEqual(expect.any(String));
    // Origin / destination / passenger stop share one liquid pin family.
    expect(originMarker.props.coordinate).toBeTruthy();
    expect(destinationMarker.props.coordinate).toBeTruthy();
    expect(targetMarker.props.coordinate).toBeTruthy();
    expect(renderer.root.findAllByProps({
      testID: 'tracking-map-legend-origin',
    })).not.toHaveLength(0);
    expect(renderer.root.findAllByProps({
      testID: 'tracking-map-legend-destination',
    })).not.toHaveLength(0);
    expect(renderer.root.findAllByProps({
      testID: 'tracking-map-legend-intermediate',
    })).not.toHaveLength(0);
    expect(renderer.root.findAllByProps({
      testID: 'tracking-map-legend-passenger-stop',
    })).not.toHaveLength(0);

    const vehicle = renderer.root.findAllByProps({ testID: 'tracking-vehicle-marker' })[0];
    expect(vehicle.props.coordinate).toMatchObject({
      latitude: latest.latitude,
      longitude: latest.longitude,
    });
    expect(renderer.root.findByProps({
      testID: 'tracking-bus-vehicle-glyph',
    }).props.style).toEqual(expect.objectContaining({
      backgroundColor: TRACKING_MAP_LIGHT_PALETTE.vehicle,
    }));
    const speedBadge = renderer.root.findByProps({ testID: 'tracking-speed-badge' });
    expect(speedBadge.props.accessibilityLabel).toContain('42 km/h');
    expect(speedBadge.props.style).toEqual(expect.objectContaining({
      right: 8,
      top: 56,
    }));
    expect(renderer.root.findByProps({
      testID: 'tracking-speed-badge-value',
    }).props.children).toBe('42 km/h');

    ReactTestRenderer.act(() => map.props.onMapReady());
    expect(mockFitToCoordinates).toHaveBeenCalledWith(
      expect.any(Array),
      {
        edgePadding: { top: 48, right: 32, bottom: 200, left: 32 },
        animated: false,
      },
    );

    ReactTestRenderer.act(() => renderer.unmount());
  });

  it('keeps the driven trail visible by default for compatibility', () => {
    const firstPoint = makePoint('2026-07-20T01:00:00.000Z');
    const secondPoint = makePoint('2026-07-20T01:00:05.000Z', {
      latitude: 10.78,
      longitude: 106.71,
    });
    let renderer;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(React.createElement(NativeTrackingMap, {
        latest: secondPoint,
        trail: [firstPoint, secondPoint],
      }));
    });

    const trailColors = new Set(renderer.root.findAllByProps({
      testID: 'tracking-map-polyline',
    }).map((polyline) => polyline.props.strokeColor));
    expect(trailColors).toEqual(new Set([
      TRACKING_MAP_LIGHT_PALETTE.trailHalo,
      TRACKING_MAP_LIGHT_PALETTE.trail,
    ]));
    expect(renderer.root.findAll((node) => (
      Array.isArray(node.props.style)
      && node.props.style.some(
        (style) => style?.backgroundColor === TRACKING_MAP_LIGHT_PALETTE.trail,
      )
    ))).not.toHaveLength(0);

    ReactTestRenderer.act(() => renderer.unmount());
  });

  it('renders a large Shuttle van glyph for the vehicle marker', () => {
    const current = makePoint('2026-07-20T01:00:00.000Z', {
      speedKmh: 30,
    });
    let renderer;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(React.createElement(NativeTrackingMap, {
        latest: current,
        trail: [current],
        vehicleKind: 'shuttle',
      }));
    });

    expect(renderer.root.findAllByProps({
      testID: 'tracking-vehicle-marker',
    })).not.toHaveLength(0);
    expect(renderer.root.findAllByProps({
      testID: 'tracking-shuttle-vehicle-glyph',
    })).not.toHaveLength(0);
    expect(renderer.root.findAllByProps({
      testID: 'tracking-bus-vehicle-glyph',
    })).toHaveLength(0);
    expect(renderer.root.findAllByProps({
      testID: 'tracking-speed-badge',
    })).toHaveLength(0);

    ReactTestRenderer.act(() => renderer.unmount());
  });

  it('shows zero speed and removes the badge when a newer point omits speed', () => {
    const stopped = makePoint('2026-07-20T01:00:00.000Z', {
      speedKmh: 0,
    });
    const speedUnavailable = makePoint('2026-07-20T01:00:05.000Z', {
      latitude: 10.78,
      longitude: 106.71,
    });
    let renderer;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(React.createElement(NativeTrackingMap, {
        latest: stopped,
        trail: [stopped],
      }));
    });

    expect(renderer.root.findByProps({
      testID: 'tracking-speed-badge-value',
    }).props.children).toBe('0 km/h');

    ReactTestRenderer.act(() => {
      renderer.update(React.createElement(NativeTrackingMap, {
        latest: speedUnavailable,
        trail: [stopped, speedUnavailable],
      }));
    });

    expect(renderer.root.findAllByProps({
      testID: 'tracking-speed-badge',
    })).toHaveLength(0);

    ReactTestRenderer.act(() => renderer.unmount());
  });

  it('keeps origin distinct from planned-route teal', () => {
    expect(TRACKING_MAP_LIGHT_PALETTE.origin).toBe('#2F6FED');
    expect(TRACKING_MAP_LIGHT_PALETTE.origin).not.toContain('007D78');
    expect(TRACKING_MAP_LIGHT_PALETTE.destination).toBe('#D4544A');
    expect(TRACKING_MAP_LIGHT_PALETTE.target).toBe('#5B4BDB');
    expect(TRACKING_MAP_DARK_PALETTE.origin).toBe('#7EB6FF');
    expect(TRACKING_MAP_DARK_PALETTE.origin).not.toBe('#55F1E8');
  });

  it('keeps route POIs without drawing or advertising an unavailable geometry', () => {
    const current = makePoint('2026-07-20T01:00:00.000Z');
    let renderer;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(React.createElement(NativeTrackingMap, {
        latest: current,
        trail: [],
        plannedRoute: [],
        markers: [{
          id: 'stop-without-geometry',
          name: 'Visible route stop',
          latitude: 10.78,
          longitude: 106.71,
          kind: 'intermediate',
          sequence: 1,
        }],
        showDrivenTrail: false,
      }));
    });

    expect(renderer.root.findAllByProps({
      testID: 'tracking-map-polyline',
    })).toHaveLength(0);
    expect(renderer.root.findAllByProps({
      testID: 'tracking-stop-marker',
    })).not.toHaveLength(0);
    expect(renderer.root.findAllByProps({
      testID: 'tracking-map-legend-planned-route',
    })).toHaveLength(0);

    ReactTestRenderer.act(() => renderer.unmount());
  });
});
