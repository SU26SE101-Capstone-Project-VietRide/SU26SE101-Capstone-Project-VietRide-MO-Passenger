export type GeoPoint = Readonly<{
  latitude: number;
  longitude: number;
}>;

export type GeoJSONPosition = readonly [longitude: number, latitude: number];

export function assertGeoPoint(point: GeoPoint): GeoPoint {
  if (!Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)) {
    throw new Error('Invalid coordinate: latitude/longitude must be finite numbers');
  }

  if (point.latitude < -90 || point.latitude > 90) {
    throw new Error(`Invalid latitude: ${point.latitude}`);
  }

  if (point.longitude < -180 || point.longitude > 180) {
    throw new Error(`Invalid longitude: ${point.longitude}`);
  }

  return point;
}

export function toGoongLatLng(point: GeoPoint): string {
  const valid = assertGeoPoint(point);
  return `${valid.latitude},${valid.longitude}`;
}

export function toGeoJSONPosition(point: GeoPoint): GeoJSONPosition {
  const valid = assertGeoPoint(point);
  return [valid.longitude, valid.latitude];
}

export function fromGoongLocation(location: {
  lat: number;
  lng: number;
}): GeoPoint {
  return assertGeoPoint({
    latitude: location.lat,
    longitude: location.lng,
  });
}
