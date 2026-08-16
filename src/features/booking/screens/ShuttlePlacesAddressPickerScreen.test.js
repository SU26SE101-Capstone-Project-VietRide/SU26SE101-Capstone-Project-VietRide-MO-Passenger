const fs = require('fs');
const path = require('path');

const read = relativePath =>
  fs.readFileSync(path.resolve(__dirname, relativePath), 'utf8');

describe('Shuttle Places-only address picker contract', () => {
  const pickerSource = read('ShuttlePlacesAddressPickerScreen.tsx');
  const navigatorSource = read('../BookingNavigator.tsx');

  it('routes ShuttleAddressPicker to the Places-only screen', () => {
    expect(navigatorSource).toContain(
      "from './screens/ShuttlePlacesAddressPickerScreen'",
    );
    expect(navigatorSource).toContain(
      'component={ShuttlePlacesAddressPickerScreen}',
    );
    expect(navigatorSource).not.toContain(
      "from './screens/ShuttleAddressPickerScreen'",
    );
  });

  it('uses autocomplete and Place Details without a map canvas', () => {
    expect(pickerSource).toContain(
      'findPredictions: findPredictionsWithSession',
    );
    expect(pickerSource).toContain('resolvePlaceDetails({');
    expect(pickerSource).toContain('endSession: true');
    expect(pickerSource).toContain('<FlashList');
    expect(pickerSource).toContain('<KeyboardAvoidingView');

    expect(pickerSource).not.toContain('Mapbox');
    expect(pickerSource).not.toContain('react-native-maps');
    expect(pickerSource).not.toContain('resolveMapPlaceSelection');
    expect(pickerSource).not.toContain('PointAnnotation');
  });

  it('rejects an address farther than the BE 10 km station cap before saving', () => {
    expect(pickerSource).toContain('BIAS_RADIUS_METERS = SHUTTLE_MAX_ROAD_DISTANCE_METERS');
    expect(pickerSource).toContain('checkShuttleAddressAgainstStation');
    expect(pickerSource).toContain('tooFarFromDeparture');
    expect(pickerSource).toContain('tooFarFromDestination');
    expect(pickerSource).toContain('limitKm: SHUTTLE_MAX_ROAD_DISTANCE_KM');
    expect(pickerSource).not.toContain('5_000');
    expect(pickerSource).not.toContain('5 km');
  });

  it('treats tapping a verified prediction as the complete selection action', () => {
    expect(pickerSource).toContain('const saveResolvedPlace = useCallback');
    expect(pickerSource).toContain('setSelectedShuttlePickup(draft)');
    expect(pickerSource).toContain('setSelectedShuttleDropoff(draft)');
    expect(pickerSource).toContain('saveResolvedPlace(place)');
    expect(pickerSource).toContain('navigation.goBack()');
    expect(pickerSource).not.toContain('shuttle-confirm-address');
    expect(pickerSource).not.toContain('handleConfirm');
    expect(pickerSource).not.toContain('confirmEnabled');
    expect(pickerSource).not.toContain("from '@shared/components/Button'");
  });

  it('opens directly as a focused full-screen address search', () => {
    expect(pickerSource).toContain('autoFocus');
    expect(pickerSource).toContain(
      'selectTextOnFocus={Boolean(existingDraft)}',
    );
    expect(pickerSource).toContain('keyboardShouldPersistTaps="always"');
    expect(pickerSource).not.toContain('guidanceCard');
    expect(pickerSource).not.toContain('selectedCard');
  });

  it('does not use GPS or a non-Places geocoder as another selection path', () => {
    expect(pickerSource).not.toContain('@shared/services/deviceLocation');
    expect(pickerSource).not.toContain('requestForegroundLocationPermission');
    expect(pickerSource).not.toContain('getCurrentCoordinates');
    expect(pickerSource).not.toContain('reverseGeocodeCoordinates');
    expect(pickerSource).not.toContain('shuttle-use-current-location');
  });
});
