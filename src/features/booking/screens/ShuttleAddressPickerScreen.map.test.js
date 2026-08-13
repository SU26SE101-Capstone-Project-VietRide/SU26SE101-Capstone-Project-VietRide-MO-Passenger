const fs = require('fs');
const path = require('path');

const screenSource = fs.readFileSync(
  path.join(__dirname, 'ShuttleAddressPickerScreen.tsx'),
  'utf8',
);

describe('ShuttleAddressPickerScreen map provider contract', () => {
  it('uses Mapbox for the picker canvas, camera and annotations', () => {
    expect(screenSource).toContain('<Mapbox.MapView');
    expect(screenSource).toContain('<Mapbox.Camera');
    expect(screenSource).toContain('<Mapbox.PointAnnotation');
    expect(screenSource).toContain('queryRenderedFeaturesAtPoint');
    expect(screenSource).toContain('onDragEnd={handleMapboxMarkerDragEnd}');
  });

  it('keeps Google Places verification separate from the visual map provider', () => {
    expect(screenSource).toContain('appConfig.nativeMapboxEnabled');
    expect(screenSource).toContain('appConfig.nativeGoogleMapsEnabled');
    expect(screenSource).toContain('resolveMapPlaceSelection');
    expect(screenSource).toContain('map-poi:mapbox:');
    expect(screenSource).not.toContain("from 'react-native-maps'");
  });

  it('keeps Mapbox legal ornaments above the confirmation sheet', () => {
    expect(screenSource).toContain('logoEnabled');
    expect(screenSource).toContain('attributionEnabled');
    expect(screenSource).toContain('mapboxOrnamentPosition');
    expect(screenSource).toContain('padding={cameraPadding}');
  });

  it('offers an explicit current-location action for pickup only', () => {
    expect(screenSource).toContain('testID="shuttle-use-current-location"');
    expect(screenSource).toContain('{!isDropoff ? (');
    expect(screenSource).toContain('requestForegroundLocationPermission');
    expect(screenSource).toContain('getCurrentCoordinates');
    expect(screenSource).toContain('reverseGeocodeCoordinates');
    expect(screenSource).toContain('formatStreetAddressForPlaceSearch');
    expect(screenSource).toContain('searchBiasRef.current = coordinates');
    expect(screenSource).toContain(
      'setQuery(addressQuery.slice(0, SHUTTLE_ADDRESS_MAX_LENGTH))',
    );
    expect(screenSource).toContain('setSearchInputActive(true)');
    expect(screenSource).not.toContain('map-poi:device:');
    expect(screenSource).not.toContain('geocodedAddress.name');
    expect(screenSource).toContain('testID="shuttle-current-location-marker"');
    expect(screenSource.indexOf('requestForegroundLocationPermission()'))
      .toBeLessThan(screenSource.indexOf('getCurrentCoordinates({'));
  });
});
