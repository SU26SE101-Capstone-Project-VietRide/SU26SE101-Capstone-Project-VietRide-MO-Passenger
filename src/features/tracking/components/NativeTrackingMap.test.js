const React = require('react');
const ReactTestRenderer = require('react-test-renderer');

const mockAnimateCamera = jest.fn();

jest.mock('phosphor-react-native', () => ({
  Bus: () => null,
  Crosshair: () => null,
  MapPin: () => null,
}));

jest.mock('react-native-maps', () => {
  const ReactModule = require('react');
  const { View: NativeView } = require('react-native');

  const MapView = ReactModule.forwardRef((props, ref) => {
    ReactModule.useImperativeHandle(ref, () => ({
      animateCamera: mockAnimateCamera,
    }));
    return ReactModule.createElement(
      NativeView,
      { ...props, testID: 'tracking-native-map' },
      props.children,
    );
  });
  MapView.displayName = 'MockMapView';

  const MapChild = (props) => ReactModule.createElement(
    NativeView,
    props,
    props.children,
  );

  return {
    __esModule: true,
    default: MapView,
    Marker: MapChild,
    Polyline: MapChild,
    PROVIDER_GOOGLE: 'google',
  };
});

const { NativeTrackingMap } = require('./NativeTrackingMap');

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
    ReactTestRenderer.act(() => map.props.onPanDrag());

    ReactTestRenderer.act(() => {
      renderer.update(React.createElement(NativeTrackingMap, {
        latest: secondPoint,
        points: [firstPoint, secondPoint],
        stops: [],
      }));
    });
    expect(mockAnimateCamera).not.toHaveBeenCalled();

    const recenter = renderer.root.findByProps({
      accessibilityLabel: 'Follow the live bus location',
    });
    ReactTestRenderer.act(() => recenter.props.onPress());

    expect(mockAnimateCamera).toHaveBeenCalledTimes(1);
    expect(mockAnimateCamera).toHaveBeenCalledWith(
      {
        center: { latitude: 10.78, longitude: 106.71 },
        zoom: 15,
      },
      { duration: 350 },
    );

    ReactTestRenderer.act(() => renderer.unmount());
  });
});
