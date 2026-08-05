import type { MapStyleElement } from 'react-native-maps';

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
  next: string;
  target: string;
  shuttleStation: string;
  frameBorder: string;
  progressSurface: string;
  trailSurface: string;
  vehicleSurface: string;
}

const freezeMapStyle = (style: MapStyleElement[]): MapStyleElement[] =>
  Object.freeze(style) as unknown as MapStyleElement[];

const freezePalette = (palette: TrackingMapPalette): Readonly<TrackingMapPalette> =>
  Object.freeze(palette);

export const TRACKING_MAP_LIGHT_PALETTE = freezePalette({
  plannedRoute: 'rgba(79, 70, 229, 0.72)',
  plannedRouteHalo: 'rgba(255, 255, 255, 0.92)',
  trail: '#0284C7',
  trailHalo: 'rgba(255, 255, 255, 0.96)',
  vehicle: '#F97316',
  vehicleHalo: 'rgba(249, 115, 22, 0.24)',
  origin: '#16A34A',
  destination: '#E11D48',
  intermediate: '#64748B',
  next: '#D97706',
  target: '#7C3AED',
  shuttleStation: '#2563EB',
  frameBorder: 'rgba(79, 70, 229, 0.24)',
  progressSurface: 'rgba(79, 70, 229, 0.08)',
  trailSurface: 'rgba(2, 132, 199, 0.09)',
  vehicleSurface: 'rgba(249, 115, 22, 0.10)',
});

export const TRACKING_MAP_DARK_PALETTE = freezePalette({
  plannedRoute: 'rgba(167, 139, 250, 0.82)',
  plannedRouteHalo: 'rgba(2, 6, 23, 0.90)',
  trail: '#22D3EE',
  trailHalo: 'rgba(2, 6, 23, 0.94)',
  vehicle: '#FB923C',
  vehicleHalo: 'rgba(251, 146, 60, 0.25)',
  origin: '#4ADE80',
  destination: '#FB7185',
  intermediate: '#94A3B8',
  next: '#FBBF24',
  target: '#A78BFA',
  shuttleStation: '#60A5FA',
  frameBorder: 'rgba(167, 139, 250, 0.32)',
  progressSurface: 'rgba(167, 139, 250, 0.10)',
  trailSurface: 'rgba(34, 211, 238, 0.10)',
  vehicleSurface: 'rgba(251, 146, 60, 0.11)',
});

export const getTrackingMapPalette = (isDark: boolean): Readonly<TrackingMapPalette> =>
  isDark ? TRACKING_MAP_DARK_PALETTE : TRACKING_MAP_LIGHT_PALETTE;

export const LIQUID_LIGHT_MAP_STYLE = freezeMapStyle([
  {
    featureType: 'landscape',
    elementType: 'geometry.fill',
    stylers: [{ color: '#F5F3EE' }],
  },
  {
    featureType: 'landscape.natural',
    elementType: 'geometry.fill',
    stylers: [{ color: '#E7F2DF' }],
  },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#4A5568' }] },
  {
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#FFFDF9' }, { weight: 3 }],
  },
  {
    featureType: 'administrative',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#D8D4CC' }],
  },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#27364A' }],
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
    stylers: [{ color: '#D8EDCF' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.fill',
    stylers: [{ color: '#FFFEFC' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#DDD9D0' }],
  },
  {
    featureType: 'road.arterial',
    elementType: 'geometry.fill',
    stylers: [{ color: '#F3F1EC' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.fill',
    stylers: [{ color: '#FFD89B' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#E8B85F' }],
  },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  {
    featureType: 'water',
    elementType: 'geometry.fill',
    stylers: [{ color: '#CFE8FF' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#4B7195' }],
  },
]);

export const LIQUID_DARK_MAP_STYLE = freezeMapStyle([
  {
    featureType: 'landscape',
    elementType: 'geometry.fill',
    stylers: [{ color: '#111827' }],
  },
  {
    featureType: 'landscape.natural',
    elementType: 'geometry.fill',
    stylers: [{ color: '#152B25' }],
  },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#CBD5E1' }] },
  {
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#0B1220' }, { weight: 3 }],
  },
  {
    featureType: 'administrative',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#3B465C' }],
  },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#E2E8F0' }],
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
    stylers: [{ color: '#173326' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.fill',
    stylers: [{ color: '#273248' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#0B1220' }],
  },
  {
    featureType: 'road.arterial',
    elementType: 'geometry.fill',
    stylers: [{ color: '#35415B' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.fill',
    stylers: [{ color: '#6A5132' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#8A6B3F' }],
  },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  {
    featureType: 'water',
    elementType: 'geometry.fill',
    stylers: [{ color: '#0B3558' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#7CB7E8' }],
  },
]);
