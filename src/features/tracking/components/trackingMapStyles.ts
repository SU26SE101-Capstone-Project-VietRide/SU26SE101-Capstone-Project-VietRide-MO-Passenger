/**
 * Map route/marker palette — aligned to VietRide Liquid Glass brand (teal/mint)
 * instead of generic indigo/sky/orange Tailwind defaults.
 */
export interface TrackingMapPalette {
  plannedRoute: string;
  plannedRouteHalo: string;
  trail: string;
  trailHalo: string;
  vehicle: string;
  vehicleHalo: string;
  origin: string;
  destination: string;
  intermediate: string;
  intermediateBorder: string;
  next: string;
  nextHalo: string;
  target: string;
  targetHalo: string;
  markerGlyph: string;
  vehicleGlyph: string;
  shuttleTarget: string;
  shuttleStation: string;
  frameBorder: string;
  progressSurface: string;
  trailSurface: string;
  vehicleSurface: string;
  legendSurface: string;
  legendBorder: string;
  legendText: string;
  sequenceText: string;
}

const freezePalette = (
  palette: TrackingMapPalette,
): Readonly<TrackingMapPalette> => Object.freeze(palette);

/**
 * Semantic marker family for the light map: saturated fills keep white glyphs
 * legible outdoors, while hue + icon shape communicate each role.
 */
export const TRACKING_MAP_LIGHT_PALETTE = freezePalette({
  plannedRoute: '#007D78',
  plannedRouteHalo: 'rgba(255, 255, 255, 0.94)',
  trail: '#627A77',
  trailHalo: 'rgba(255, 255, 255, 0.96)',
  vehicle: '#9A6500',
  vehicleHalo: 'rgba(154, 101, 0, 0.26)',

  origin: '#2457D6',
  destination: '#B8325A',
  intermediate: '#FFFFFF',
  intermediateBorder: '#007D78',
  next: '#9A6500',
  nextHalo: 'rgba(154, 101, 0, 0.20)',
  target: '#5B3FC4',
  targetHalo: 'rgba(91, 63, 196, 0.22)',
  markerGlyph: '#FFFFFF',
  vehicleGlyph: '#FFFFFF',
  shuttleTarget: '#007D78',
  shuttleStation: '#005B57',
  frameBorder: 'rgba(0, 125, 120, 0.22)',
  progressSurface: 'rgba(0, 125, 120, 0.08)',
  trailSurface: 'rgba(26, 168, 162, 0.10)',
  vehicleSurface: 'rgba(154, 101, 0, 0.12)',
  legendSurface: 'rgba(255, 255, 255, 0.90)',
  legendBorder: 'rgba(0, 125, 120, 0.16)',
  legendText: '#13211F',
  sequenceText: '#007D78',
});

export const TRACKING_MAP_DARK_PALETTE = freezePalette({
  // Dark mode reverses luminance: light fills use a shared charcoal glyph.
  plannedRoute: '#55F1E8',
  plannedRouteHalo: 'rgba(6, 19, 19, 0.88)',
  trail: '#8FA7A3',
  trailHalo: 'rgba(6, 19, 19, 0.90)',
  vehicle: '#FFD166',
  vehicleHalo: 'rgba(255, 209, 102, 0.28)',

  origin: '#7DB7FF',
  destination: '#FF8EAA',
  intermediate: 'rgba(20, 38, 38, 0.94)',
  intermediateBorder: '#55F1E8',
  next: '#FFD166',
  nextHalo: 'rgba(255, 209, 102, 0.22)',
  target: '#C1B3FF',
  targetHalo: 'rgba(193, 179, 255, 0.24)',
  markerGlyph: '#10201F',
  vehicleGlyph: '#10201F',
  shuttleTarget: '#55F1E8',
  shuttleStation: '#9FFFF8',
  frameBorder: 'rgba(85, 241, 232, 0.28)',
  progressSurface: 'rgba(85, 241, 232, 0.10)',
  trailSurface: 'rgba(143, 167, 163, 0.12)',
  vehicleSurface: 'rgba(255, 209, 102, 0.12)',
  legendSurface: 'rgba(13, 34, 33, 0.92)',
  legendBorder: 'rgba(184, 255, 249, 0.18)',
  legendText: '#F4FFFD',
  sequenceText: '#9FFFF8',
});

export const getTrackingMapPalette = (
  isDark: boolean,
): Readonly<TrackingMapPalette> =>
  isDark ? TRACKING_MAP_DARK_PALETTE : TRACKING_MAP_LIGHT_PALETTE;
