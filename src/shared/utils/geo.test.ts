import {
  isValidGeoCoordinate,
  isValidLatitude,
  isValidLongitude,
} from './geo';

describe('isValidGeoCoordinate', () => {
  it.each([
    { latitude: 0, longitude: 0 },
    { latitude: -90, longitude: -180 },
    { latitude: 90, longitude: 180 },
    { latitude: 10.7769, longitude: 106.7009 },
  ])('accepts a coordinate inside the world bounds', (coordinate) => {
    expect(isValidGeoCoordinate(coordinate)).toBe(true);
  });

  it.each([
    { latitude: Number.NaN, longitude: 0 },
    { latitude: Number.POSITIVE_INFINITY, longitude: 0 },
    { latitude: 90.001, longitude: 0 },
    { latitude: 0, longitude: -180.001 },
  ])('rejects a coordinate unsafe for native maps', (coordinate) => {
    expect(isValidGeoCoordinate(coordinate)).toBe(false);
  });

  it('validates individual coordinate components without temporary objects', () => {
    expect(isValidLatitude(-90)).toBe(true);
    expect(isValidLatitude(91)).toBe(false);
    expect(isValidLongitude(180)).toBe(true);
    expect(isValidLongitude(Number.NaN)).toBe(false);
  });
});
