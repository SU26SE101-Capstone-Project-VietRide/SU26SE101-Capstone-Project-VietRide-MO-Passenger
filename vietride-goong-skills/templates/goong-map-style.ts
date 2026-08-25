export function createGoongStyleUrl(maptilesKey: string): string {
  if (!maptilesKey) {
    throw new Error('Missing Goong Maptiles key');
  }

  return `https://tiles.goong.io/assets/goong_map_web.json?api_key=${encodeURIComponent(
    maptilesKey,
  )}`;
}

export function createGoongSatelliteStyleUrl(maptilesKey: string): string {
  if (!maptilesKey) {
    throw new Error('Missing Goong Maptiles key');
  }

  return `https://tiles.goong.io/assets/goong_satellite.json?api_key=${encodeURIComponent(
    maptilesKey,
  )}`;
}
