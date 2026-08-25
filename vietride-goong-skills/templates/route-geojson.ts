import type { GeoPoint } from './coordinate';
import { toGeoJSONPosition } from './coordinate';

export function routeToGeoJSON(points: GeoPoint[]) {
  return {
    type: 'Feature' as const,
    properties: {},
    geometry: {
      type: 'LineString' as const,
      coordinates: points.map(toGeoJSONPosition),
    },
  };
}
