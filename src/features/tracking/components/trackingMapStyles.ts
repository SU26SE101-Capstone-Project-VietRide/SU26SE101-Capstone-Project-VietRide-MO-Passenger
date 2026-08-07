import type { MapStyleElement } from 'react-native-maps';

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

const freezeMapStyle = (style: MapStyleElement[]): MapStyleElement[] =>
  Object.freeze(style) as unknown as MapStyleElement[];

const freezePalette = (palette: TrackingMapPalette): Readonly<TrackingMapPalette> =>
  Object.freeze(palette);

/** Liquid Light — brand teal planned route, mint trail, warm vehicle accent. */
export const TRACKING_MAP_LIGHT_PALETTE = freezePalette({
  plannedRoute: 'rgba(0, 125, 120, 0.88)',
  plannedRouteHalo: 'rgba(255, 255, 255, 0.94)',
  trail: '#1AA8A2',
  trailHalo: 'rgba(255, 255, 255, 0.96)',
  vehicle: '#E6A800',
  vehicleHalo: 'rgba(230, 168, 0, 0.28)',
  origin: '#0F9F6E',
  destination: '#C43C3C',
  intermediate: '#E8F4F3',
  intermediateBorder: '#007D78',
  next: '#D97706',
  nextHalo: 'rgba(217, 119, 6, 0.22)',
  target: '#007D78',
  targetHalo: 'rgba(0, 125, 120, 0.22)',
  shuttleStation: '#006A67',
  frameBorder: 'rgba(0, 125, 120, 0.22)',
  progressSurface: 'rgba(0, 125, 120, 0.08)',
  trailSurface: 'rgba(26, 168, 162, 0.10)',
  vehicleSurface: 'rgba(230, 168, 0, 0.12)',
  legendSurface: 'rgba(255, 255, 255, 0.88)',
  legendBorder: 'rgba(0, 125, 120, 0.18)',
  legendText: '#13211F',
  sequenceText: '#007D78',
});

/** Liquid Dark — luminous mint/cyan on deep teal canvas. */
export const TRACKING_MAP_DARK_PALETTE = freezePalette({
  plannedRoute: 'rgba(85, 241, 232, 0.86)',
  plannedRouteHalo: 'rgba(6, 19, 19, 0.88)',
  trail: '#55F1E8',
  trailHalo: 'rgba(6, 19, 19, 0.90)',
  vehicle: '#FFD166',
  vehicleHalo: 'rgba(255, 209, 102, 0.28)',
  origin: '#4ADE80',
  destination: '#FB7185',
  intermediate: 'rgba(18, 48, 45, 0.92)',
  intermediateBorder: 'rgba(85, 241, 232, 0.72)',
  next: '#FBBF24',
  nextHalo: 'rgba(251, 191, 36, 0.24)',
  target: '#55F1E8',
  targetHalo: 'rgba(85, 241, 232, 0.22)',
  shuttleStation: '#9FFFF8',
  frameBorder: 'rgba(85, 241, 232, 0.28)',
  progressSurface: 'rgba(85, 241, 232, 0.10)',
  trailSurface: 'rgba(85, 241, 232, 0.10)',
  vehicleSurface: 'rgba(255, 209, 102, 0.12)',
  legendSurface: 'rgba(13, 34, 33, 0.90)',
  legendBorder: 'rgba(184, 255, 249, 0.20)',
  legendText: '#F4FFFD',
  sequenceText: '#9FFFF8',
});

export const getTrackingMapPalette = (isDark: boolean): Readonly<TrackingMapPalette> =>
  isDark ? TRACKING_MAP_DARK_PALETTE : TRACKING_MAP_LIGHT_PALETTE;

/** Soft off-white / mint landscape — pairs with brand teal routes. */
export const LIQUID_LIGHT_MAP_STYLE = freezeMapStyle([
  {
    featureType: 'landscape',
    elementType: 'geometry.fill',
    stylers: [{ color: '#F2F7F6' }],
  },
  {
    featureType: 'landscape.natural',
    elementType: 'geometry.fill',
    stylers: [{ color: '#E4F0E6' }],
  },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#3D524F' }] },
  {
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#F8FCFB' }, { weight: 3 }],
  },
  {
    featureType: 'administrative',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#D0DDDB' }],
  },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#1A2E2C' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  {
    featureType: 'poi.park',
    elementType: 'geometry.fill',
    stylers: [{ color: '#D4EBD6' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.fill',
    stylers: [{ color: '#FFFFFF' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#D5E0DE' }],
  },
  {
    featureType: 'road.arterial',
    elementType: 'geometry.fill',
    stylers: [{ color: '#F4F9F8' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.fill',
    stylers: [{ color: '#FFE4B0' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#E8C07A' }],
  },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  {
    featureType: 'water',
    elementType: 'geometry.fill',
    stylers: [{ color: '#C5E6E8' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#4A7A7C' }],
  },
]);

/** Deep charcoal-teal canvas for Liquid Dark. */
export const LIQUID_DARK_MAP_STYLE = freezeMapStyle([
  {
    featureType: 'landscape',
    elementType: 'geometry.fill',
    stylers: [{ color: '#0A1615' }],
  },
  {
    featureType: 'landscape.natural',
    elementType: 'geometry.fill',
    stylers: [{ color: '#0F221F' }],
  },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#B8D4D0' }] },
  {
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#061313' }, { weight: 3 }],
  },
  {
    featureType: 'administrative',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1F3A37' }],
  },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#E8FFFB' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  {
    featureType: 'poi.park',
    elementType: 'geometry.fill',
    stylers: [{ color: '#122B24' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.fill',
    stylers: [{ color: '#1A2E2C' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#061313' }],
  },
  {
    featureType: 'road.arterial',
    elementType: 'geometry.fill',
    stylers: [{ color: '#223A37' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.fill',
    stylers: [{ color: '#3D3420' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#5C4E2A' }],
  },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  {
    featureType: 'water',
    elementType: 'geometry.fill',
    stylers: [{ color: '#0A2A32' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#6EB8BC' }],
  },
]);
